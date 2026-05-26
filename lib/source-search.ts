/**
 * AI-enhanced source search orchestrator.
 * Uses Claude to decompose complex queries into targeted Sefaria searches,
 * then ranks results by relevance.
 */

import { askClaude, MODELS } from './ai';
import { searchKeyword, fetchText, fetchTopic, type SefariaResult } from './sefaria';

export type QueryMode = 'keyword' | 'smart';

export interface SmartSearchResult extends SefariaResult {
  relevance?: string;
  matchType?: 'keyword' | 'reference' | 'topic' | 'related';
}

interface Decomposition {
  searches: string[];
  refs: string[];
  topics: string[];
}

/** Heuristic: decide whether a query needs AI or plain keyword search. */
export function classifyQuery(q: string): QueryMode {
  const trimmed = q.trim();

  // Very short → keyword
  if (trimmed.split(/\s+/).length <= 3 && trimmed.length < 80) {
    // Unless it contains question words
    if (/^(why|how|what|when|explain|describe|find|show|tell)/i.test(trimmed)) {
      return 'smart';
    }
    return 'keyword';
  }

  // Long text block → smart
  if (trimmed.length > 200) return 'smart';

  // Multi-word phrase → smart
  return 'smart';
}

/** Ask Haiku to decompose a complex query into targeted search terms. */
async function decomposeQuery(q: string): Promise<Decomposition> {
  const prompt = `You are helping a rabbi find Torah, Talmud, and Jewish source texts. Given their search query, generate targeted search terms for Sefaria's text database.

Query: "${q.substring(0, 2000)}"

Return ONLY valid JSON (no markdown, no explanation):
{
  "searches": ["term1", "term2", ...],
  "refs": ["Genesis 1:1", ...],
  "topics": ["topic-slug", ...]
}

Rules:
- "searches": 3-6 short keyword phrases that would match relevant passages in Sefaria's keyword search (e.g., "kashrut shellfish", "dietary laws sea creatures", "Leviticus forbidden foods")
- "refs": specific biblical or talmudic references you are confident are relevant (use standard English reference format like "Leviticus 11:9-12" or "Chullin 59a"). Only include refs you are sure exist. If unsure, leave empty.
- "topics": Sefaria topic slugs if applicable (lowercase, hyphenated, e.g., "kashrut", "shabbat", "mourning"). Only include well-known topics. If unsure, leave empty.`;

  try {
    const raw = await askClaude(prompt, { model: MODELS.HAIKU, maxTokens: 512 });
    // Extract JSON from response (handle potential markdown wrapping)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { searches: [q.substring(0, 100)], refs: [], topics: [] };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      searches: Array.isArray(parsed.searches) ? parsed.searches.slice(0, 6) : [],
      refs: Array.isArray(parsed.refs) ? parsed.refs.slice(0, 4) : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 3) : [],
    };
  } catch {
    // Fallback: just use the raw query truncated
    return { searches: [q.substring(0, 100)], refs: [], topics: [] };
  }
}

/** Ask Haiku to rank and explain relevance of results. */
async function rankResults(
  results: SmartSearchResult[],
  originalQuery: string,
  size: number,
): Promise<SmartSearchResult[]> {
  if (results.length <= size) {
    // Not enough to rank — just add generic relevance
    return results;
  }

  // Build a compact summary for Haiku
  const summaries = results.slice(0, 40).map((r, i) => ({
    i,
    ref: r.ref,
    en: r.en.substring(0, 150),
  }));

  const prompt = `A rabbi searched for: "${originalQuery.substring(0, 500)}"

Here are ${summaries.length} source results. Pick the ${size} most relevant and explain why each is relevant in one short sentence.

Sources:
${summaries.map((s) => `[${s.i}] ${s.ref}: ${s.en}`).join('\n')}

Return ONLY a valid JSON array (no markdown):
[{"i": 0, "relevance": "..."}, {"i": 1, "relevance": "..."}, ...]

Pick exactly ${size} results, ordered by relevance (most relevant first).`;

  try {
    const raw = await askClaude(prompt, { model: MODELS.HAIKU, maxTokens: 1024 });
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return results.slice(0, size);
    const ranked: { i: number; relevance: string }[] = JSON.parse(jsonMatch[0]);
    return ranked
      .filter((r) => r.i >= 0 && r.i < results.length)
      .slice(0, size)
      .map((r) => ({
        ...results[r.i],
        relevance: r.relevance,
      }));
  } catch {
    return results.slice(0, size);
  }
}

/** Full AI-enhanced search pipeline. */
export async function smartSearch(
  q: string,
  size = 20,
): Promise<{ results: SmartSearchResult[]; meta: { mode: QueryMode; searches?: string[] } }> {
  // Step 1: Decompose the query
  const decomp = await decomposeQuery(q);

  // Step 2: Fire all Sefaria fetches in parallel
  const allPromises: Promise<{ results: SefariaResult[]; type: SmartSearchResult['matchType'] }>[] = [];

  // Keyword searches
  for (const search of decomp.searches) {
    allPromises.push(
      searchKeyword(search, 10).then((results) => ({ results, type: 'keyword' as const }))
    );
  }

  // Direct ref lookups
  for (const ref of decomp.refs) {
    allPromises.push(
      fetchText(ref)
        .then((r) => ({ results: r ? [r] : [], type: 'reference' as const }))
        .catch(() => ({ results: [], type: 'reference' as const }))
    );
  }

  // Topic lookups
  for (const topic of decomp.topics) {
    allPromises.push(
      fetchTopic(topic)
        .then((results) => ({ results, type: 'topic' as const }))
        .catch(() => ({ results: [], type: 'topic' as const }))
    );
  }

  const fetched = await Promise.all(allPromises);

  // Step 3: Deduplicate by ref, track match types and frequency
  const seen = new Map<string, SmartSearchResult>();
  const freq = new Map<string, number>();
  for (const { results: batch, type } of fetched) {
    for (const r of batch) {
      if (seen.has(r.ref)) {
        freq.set(r.ref, (freq.get(r.ref) || 1) + 1);
      } else {
        seen.set(r.ref, { ...r, matchType: type });
        freq.set(r.ref, 1);
      }
    }
  }

  // Sort by frequency (appeared in more searches = more relevant)
  let deduped = Array.from(seen.values()).sort(
    (a, b) => (freq.get(b.ref) || 0) - (freq.get(a.ref) || 0)
  );

  // Step 4: Rank with Haiku if we have enough results
  let ranked: SmartSearchResult[];
  if (deduped.length > size) {
    ranked = await rankResults(deduped, q, size);
  } else {
    ranked = deduped;
  }

  return {
    results: ranked,
    meta: {
      mode: 'smart',
      searches: decomp.searches,
    },
  };
}
