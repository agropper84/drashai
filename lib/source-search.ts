/**
 * AI-enhanced source search orchestrator.
 * Uses Claude to decompose complex queries into targeted Sefaria searches,
 * then ranks results by relevance.
 */

import { askClaude, MODELS } from './ai';
import { searchKeyword, fetchText, fetchTopic, fetchRelated, type SefariaResult } from './sefaria';

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

interface DeepDecomposition extends Decomposition {
  followups: string[];
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

// ─── Deep search ─────────────────────────────────────────────

/** Sonnet-powered deep decomposition — broader, more thorough. */
async function deepDecomposeQuery(q: string): Promise<DeepDecomposition> {
  const prompt = `You are helping a rabbi do deep research into Jewish sources. Given their question, generate an EXHAUSTIVE set of search terms to find ALL relevant passages across Torah, Talmud, Midrash, Halacha, and commentaries.

Query: "${q.substring(0, 2000)}"

Return ONLY valid JSON (no markdown, no explanation):
{
  "searches": ["term1", "term2", ...],
  "refs": ["Leviticus 11:9-12", ...],
  "topics": ["topic-slug", ...],
  "followups": ["related angle 1", ...]
}

Rules:
- "searches": 8-12 keyword/phrase searches. Include Hebrew terms (transliterated), Aramaic terms, English equivalents, and related concepts. Cast a wide net — different phrasings find different texts.
- "refs": 5-8 specific biblical or talmudic references you are confident are directly relevant. Use standard format (e.g., "Shabbat 156b", "Leviticus 19:18", "Kiddushin 31a"). Only include refs you know exist.
- "topics": 3-5 Sefaria topic slugs (lowercase, hyphenated). Include the main topic and adjacent ones.
- "followups": 2-3 related questions or angles that would surface additional sources (e.g., for "why kippah" → "head covering modesty", "yirat shamayim fear of heaven", "minhag custom vs halacha").

Be thorough and scholarly.`;

  try {
    const raw = await askClaude(prompt, { model: MODELS.SONNET, maxTokens: 1024 });
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { searches: [q.substring(0, 100)], refs: [], topics: [], followups: [] };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      searches: Array.isArray(parsed.searches) ? parsed.searches.slice(0, 12) : [],
      refs: Array.isArray(parsed.refs) ? parsed.refs.slice(0, 8) : [],
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5) : [],
      followups: Array.isArray(parsed.followups) ? parsed.followups.slice(0, 3) : [],
    };
  } catch {
    return { searches: [q.substring(0, 100)], refs: [], topics: [], followups: [] };
  }
}

/** Sonnet-powered ranking — smarter at understanding relevance. */
async function deepRankResults(
  results: SmartSearchResult[],
  originalQuery: string,
  size: number,
): Promise<SmartSearchResult[]> {
  if (results.length <= size) return results;

  const summaries = results.slice(0, 60).map((r, i) => ({
    i,
    ref: r.ref,
    en: r.en.substring(0, 200),
  }));

  const prompt = `A rabbi is doing deep research on: "${originalQuery.substring(0, 500)}"

Here are ${summaries.length} source results from across the Jewish canon. Select the ${size} most relevant and substantive sources — prioritize passages that directly address the question, contain halachic rulings, offer reasoning, or provide foundational texts.

Sources:
${summaries.map((s) => `[${s.i}] ${s.ref}: ${s.en}`).join('\n')}

Return ONLY a valid JSON array (no markdown):
[{"i": 0, "relevance": "one sentence explaining why this source matters"}, ...]

Pick exactly ${size} results. Order by importance — foundational texts first, then supporting sources.`;

  try {
    const raw = await askClaude(prompt, { model: MODELS.SONNET, maxTokens: 2048 });
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

/** Deep search pipeline — broader decomposition, more fetches, related expansion. */
export async function deepSearch(
  q: string,
  size = 30,
): Promise<{ results: SmartSearchResult[]; meta: { mode: 'deep'; searches?: string[] } }> {
  // Step 1: Deep decomposition with Sonnet
  const decomp = await deepDecomposeQuery(q);

  // Step 2: Fire all Sefaria fetches in parallel — more volume than smartSearch
  const allPromises: Promise<{ results: SefariaResult[]; type: SmartSearchResult['matchType'] }>[] = [];

  // Primary keyword searches (15 results each instead of 10)
  for (const search of decomp.searches) {
    allPromises.push(
      searchKeyword(search, 15).then((results) => ({ results, type: 'keyword' as const }))
    );
  }

  // Follow-up angle searches
  for (const followup of decomp.followups) {
    allPromises.push(
      searchKeyword(followup, 10).then((results) => ({ results, type: 'keyword' as const }))
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

  // Step 3: Deduplicate
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

  // Sort by frequency
  const deduped = Array.from(seen.values()).sort(
    (a, b) => (freq.get(b.ref) || 0) - (freq.get(a.ref) || 0)
  );

  // Step 4: Related expansion — fetch related texts for top 10 results
  const topRefs = deduped.slice(0, 10).map((r) => r.ref);
  const relatedBatches = await Promise.all(
    topRefs.map((ref) =>
      fetchRelated(ref)
        .then((results) => ({ results, type: 'related' as const }))
        .catch(() => ({ results: [] as SefariaResult[], type: 'related' as const }))
    )
  );

  // Merge related results into the deduped set
  for (const { results: batch, type } of relatedBatches) {
    for (const r of batch) {
      if (!seen.has(r.ref)) {
        seen.set(r.ref, { ...r, matchType: type });
        deduped.push({ ...r, matchType: type });
      }
    }
  }

  // Step 5: Rank with Sonnet
  const ranked = await deepRankResults(deduped, q, size);

  return {
    results: ranked,
    meta: {
      mode: 'deep',
      searches: [...decomp.searches, ...decomp.followups],
    },
  };
}
