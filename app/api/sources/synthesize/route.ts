// POST /api/sources/synthesize — Streaming synthesis of a comprehensive answer
// from the provided sources. Uses Sonnet for scholarly quality.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getClient, getUserAIConfig } from '@/lib/ai';

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

Rules:
- Use ONLY the provided sources — do not add outside knowledge or speculation
- Cite every source inline using its reference (e.g., "As stated in Shabbat 156b...")
- Organize the answer by theme, development of the law, or chronological layers (Torah → Talmud → later authorities)
- Present different opinions where they exist, noting who holds each view
- Use a scholarly but accessible tone — a rabbi preparing for a shiur
- Preserve Hebrew and Aramaic terms with brief translation in parentheses
- If the sources don't fully answer the question, say so honestly rather than inventing
- Use paragraph breaks for readability`;

  const userPrompt = `Question: ${question}

Sources to draw from (${sources.length} total):

${sourcesText}

Write a thorough, well-organized answer based exclusively on these sources.`;

  try {
    const client = await getClient();
    const stream = client.messages.stream({
      model: (await getUserAIConfig()).model,
      max_tokens: (await getUserAIConfig()).maxTokens,
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
