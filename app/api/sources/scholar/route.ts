// POST /api/sources/scholar — OpenEvidence-style deep research.
// Performs a deep search across all sources, then synthesizes a comprehensive
// source-cited answer using Opus for maximum depth and quality.
//
// Response format (streaming text):
//   __STATUS:searching__
//   __STATUS:found:24__
//   __STATUS:synthesizing__
//   __ANSWER__
//   [streamed markdown answer...]

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getClient } from '@/lib/ai';
import { MODELS } from '@/lib/models';
import { deepSearch } from '@/lib/source-search';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { question } = (await req.json()) as { question: string };
  if (!question?.trim()) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Phase 1: Deep search
        controller.enqueue(encoder.encode('__STATUS:searching__\n'));

        const { results } = await deepSearch(question, 30);

        controller.enqueue(encoder.encode(`__STATUS:found:${results.length}__\n`));

        if (results.length === 0) {
          controller.enqueue(encoder.encode('__ANSWER__\n'));
          controller.enqueue(encoder.encode('No relevant sources were found for this question. Try rephrasing or broadening your search.'));
          controller.close();
          return;
        }

        // Phase 2: Synthesize
        controller.enqueue(encoder.encode('__STATUS:synthesizing__\n'));

        const sourcesText = results
          .map((s, i) => `[${i + 1}] ${s.ref}:\n${s.en || s.he}`)
          .join('\n\n');

        // Send source refs so the client can display them
        const sourceRefs = results.map((s) => ({
          ref: s.ref, heRef: s.heRef, he: s.he, en: s.en,
          categories: s.categories, relevance: s.relevance, matchType: s.matchType,
        }));
        controller.enqueue(encoder.encode(`__SOURCES:${JSON.stringify(sourceRefs)}__\n`));

        controller.enqueue(encoder.encode('__ANSWER__\n'));

        const systemPrompt = `You are a leading rabbinical scholar preparing an authoritative, comprehensive answer to a question about Jewish law, theology, history, or practice.

Your answer should read like a well-researched entry in a rabbinical encyclopedia or a thorough responsum. Model your approach after how a leading posek or rosh yeshiva would address the question — methodical, source-grounded, and intellectually honest.

FORMAT your answer using Markdown:
- Use ## for major section headings and ### for subsections
- Use **bold** for key terms, source names, and important concepts
- Use *italics* for Hebrew/Aramaic transliterations and book titles
- Use > blockquotes for direct quotations from sources
- Use numbered lists (1. 2. 3.) for sequential arguments or enumerations
- Use bullet lists for parallel points or multiple opinions
- Use --- horizontal rules between major sections for visual clarity
- Use tables where comparing opinions, time periods, or categories would aid understanding

STRUCTURE your answer with these sections (use ## headings):
1. **Summary** — A direct, concise answer (2-3 sentences)
2. **Biblical Foundation** — Torah, Nevi'im, Ketuvim sources
3. **Talmudic Discussion** — Mishnah and Gemara
4. **Medieval Authorities (Rishonim)** — Rashi, Tosafot, Rambam, Ramban, etc.
5. **Later Authorities (Acharonim)** — Shulchan Aruch and later poskim
6. **Contemporary Practice** — Modern application and variations
7. **Key Debates** — If applicable, present machloket as a comparison table
8. **Practical Guidance** — Actionable takeaway for a practicing rabbi

WHERE APPLICABLE, include:
- A **comparison table** when multiple authorities disagree (columns: Authority | Position | Source | Reasoning)
- A **timeline or development** showing how the law/concept evolved
- A **decision tree** or flowchart (using text/ASCII) for complex halachic decision-making

CITATION rules:
- Cite EVERY source inline using its reference in parentheses, e.g., "(Shabbat 156b)" or "(Rambam, *Mishneh Torah*, Hilchot De'ot 3:3)"
- Use ONLY the provided sources — do not add outside knowledge or speculation
- Present different opinions fairly — note who holds each view and the reasoning
- Preserve Hebrew and Aramaic terms with brief English translation on first use
- If the sources don't fully answer the question, acknowledge the gap honestly`;

        const userPrompt = `Question: ${question}

Sources to draw from (${results.length} total):

${sourcesText}

Write a thorough, well-organized, properly formatted Markdown answer. Begin with a brief Summary, then develop the full scholarly analysis with clear section headings. Include comparison tables where authorities disagree.`;

        const client = await getClient();
        const stream = client.messages.stream({
          model: MODELS.OPUS,
          max_tokens: 16384,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && 'delta' in event && (event.delta as any).type === 'text_delta') {
            controller.enqueue(encoder.encode((event.delta as any).text || ''));
          }
        }

        controller.close();
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n\nError: ${err.message || 'unknown'}`));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  });
}
