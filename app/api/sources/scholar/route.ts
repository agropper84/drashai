// POST /api/sources/scholar — OpenEvidence-style deep research.
// Performs a deep search across all sources, then synthesizes a comprehensive
// source-cited answer. Streams status updates + the final answer.
//
// Response format (streaming text):
//   __STATUS:searching__
//   __STATUS:found:24__
//   __STATUS:synthesizing__
//   __ANSWER__
//   [streamed answer text...]

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getClient, getUserAIConfig } from '@/lib/ai';
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

        const systemPrompt = `You are a rabbinical scholar preparing an authoritative, comprehensive answer to a question about Jewish law, theology, history, or practice.

Your answer should read like a well-researched entry in a rabbinical encyclopedia or a thorough responsum. Model your approach after how a leading posek or rosh yeshiva would address the question — methodical, source-grounded, and intellectually honest.

Rules:
- Use ONLY the provided sources — do not add outside knowledge or speculation
- Cite every source inline using its reference in parentheses, e.g., "(Shabbat 156b)" or "(Rambam, Mishneh Torah, Hilchot De'ot 3:3)"
- Structure the answer with clear sections using the following progression where applicable:
  1. Biblical foundation (Torah, Nevi'im, Ketuvim)
  2. Mishnaic and Talmudic discussion
  3. Rishonim (medieval authorities)
  4. Acharonim and later authorities
  5. Contemporary practice
- Present different opinions where they exist — note who holds each view and the reasoning
- Use a scholarly but accessible tone — a rabbi preparing for a comprehensive shiur
- Preserve Hebrew and Aramaic terms with brief English translation in parentheses
- If the sources present a clear halachic consensus, state it; if they disagree, present the machloket fairly
- If the sources don't fully answer the question, acknowledge the gap honestly
- Begin with a brief direct answer (1-2 sentences), then develop the full analysis
- Use paragraph breaks and clear organization for readability`;

        const userPrompt = `Question: ${question}

Sources to draw from (${results.length} total):

${sourcesText}

Write a thorough, well-organized, source-cited answer. Begin with a brief direct answer, then develop the full scholarly analysis.`;

        const client = await getClient();
        const aiConfig = await getUserAIConfig();
        const stream = client.messages.stream({
          model: aiConfig.model,
          max_tokens: Math.max(aiConfig.maxTokens, 4096),
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
