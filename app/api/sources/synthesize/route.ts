// POST /api/sources/synthesize — Streaming synthesis of a comprehensive answer
// from the provided sources. Uses Opus for scholarly depth and quality.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getClient } from '@/lib/ai';
import { MODELS } from '@/lib/models';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { question, sources } = (await req.json()) as {
    question: string;
    sources: { ref: string; he: string; en: string }[];
  };

  if (!question?.trim() || !sources?.length) {
    return NextResponse.json({ error: 'Question and sources are required' }, { status: 400 });
  }

  const sourcesText = sources
    .map((s, i) => `[${i + 1}] ${s.ref}:\n${s.en || s.he}`)
    .join('\n\n');

  const systemPrompt = `You are a rabbinical scholar preparing a comprehensive, source-based answer to a question about Jewish law, theology, or practice.

FORMAT your answer using Markdown:
- Use ## for major section headings and ### for subsections
- Use **bold** for key terms and source names
- Use *italics* for Hebrew/Aramaic transliterations
- Use > blockquotes for direct quotations from sources
- Use numbered and bullet lists where appropriate
- Use tables when comparing opinions or categories
- Use --- horizontal rules between major sections

Rules:
- Use ONLY the provided sources — do not add outside knowledge or speculation
- Cite every source inline using its reference (e.g., "As stated in **Shabbat 156b**...")
- Organize by theme, development of the law, or chronological layers (Torah → Talmud → later authorities)
- Present different opinions where they exist, noting who holds each view
- Include a comparison table when authorities disagree
- Use a scholarly but accessible tone — a rabbi preparing for a shiur
- Preserve Hebrew and Aramaic terms with brief translation in parentheses on first use
- If the sources don't fully answer the question, say so honestly
- Begin with a brief ## Summary (2-3 sentences)`;

  const userPrompt = `Question: ${question}

Sources to draw from (${sources.length} total):

${sourcesText}

Write a thorough, well-organized Markdown answer with section headings, inline citations, and comparison tables where applicable.`;

  try {
    const client = await getClient();
    const stream = client.messages.stream({
      model: MODELS.OPUS,
      max_tokens: 16384,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && 'delta' in event && (event.delta as any).type === 'text_delta') {
              controller.enqueue(encoder.encode((event.delta as any).text || ''));
            }
          }
          controller.close();
        } catch (err: any) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
