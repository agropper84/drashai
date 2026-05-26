// POST /api/draft/ask — Conversational AI assistant for draft writing.
// The rabbi can ask questions like "What Torah sources support this theme?"
// or "How should I structure the opening?" and get guidance without
// generating a full draft.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getClient, MODELS } from '@/lib/ai';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { question, draft, transcript, notes, type } = (await req.json()) as {
    question: string;
    draft?: string;
    transcript?: string;
    notes?: string;
    type?: string;
  };

  if (!question?.trim()) {
    return NextResponse.json({ error: 'No question provided' }, { status: 400 });
  }

  let context = '';
  if (transcript) context += `\nENCOUNTER TRANSCRIPT:\n${transcript.substring(0, 3000)}\n`;
  if (notes) context += `\nRABBI'S NOTES:\n${notes.substring(0, 1000)}\n`;
  if (draft) context += `\nCURRENT DRAFT:\n${draft.substring(0, 3000)}\n`;

  const systemPrompt = `You are a rabbinical writing assistant helping a rabbi work on a ${type || 'sermon'}. You provide direction, suggestions, structural advice, Torah/Talmud references, and creative guidance — but you do NOT write the draft for them.

Be concise and practical. When suggesting sources, give specific references (e.g., "Bereishit 18:1-8" not just "Genesis"). When suggesting structure, be concrete (e.g., "Open with the question the family asked you, then pivot to...").

Respond in a warm, collegial tone — one rabbi advising another.`;

  const userPrompt = `${context ? `Here is the context I'm working with:${context}\n` : ''}My question: ${question}`;

  try {
    const client = await getClient();
    const stream = client.messages.stream({
      model: MODELS.SONNET,
      max_tokens: 1024,
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
