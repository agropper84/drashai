// Plan 10 — POST /api/translate. Returns plain text (non-streaming for
// simplicity; switch to streaming if you need it). Calls Claude via your
// existing lib/ai wrapper.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { askClaude } from '@/lib/ai';

const PROMPT = (text: string, direction: string) => {
  let directive = '';
  if (direction === 'he-en') directive = 'Translate the following Hebrew into English.';
  else if (direction === 'en-he') directive = 'Translate the following English into Hebrew with niqqud where natural.';
  else directive = 'Auto-detect the source language and translate the following into the other (Hebrew ↔ English).';

  return `You are translating pastoral / Torah-related material. ${directive}

Rules:
- Preserve verse references unchanged (e.g. "(Gen 18:6)" stays).
- Preserve paragraph breaks 1:1.
- Use consistent transliteration for proper names (Yaakov, not Jacob, unless name is clearly anglicized).
- Output only the translation. No commentary, no "here is the translation" preamble.

Source:
"""
${text}
"""

Translation:`;
};

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { text, direction = 'auto' } = (await req.json()) as { text: string; direction?: string };
  if (!text || !text.trim()) {
    return new NextResponse('', { headers: { 'Content-Type': 'text/plain' } });
  }

  try {
    const result = await askClaude(PROMPT(text, direction), { maxTokens: 2000 });
    return new NextResponse(result, { headers: { 'Content-Type': 'text/plain' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
