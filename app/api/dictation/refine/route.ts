// POST /api/dictation/refine — Takes raw transcription + custom prompt,
// returns refined text via Claude. Adapted from MedScribe's MedicalizeService.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { askClaude } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { text, prompt } = (await req.json()) as { text: string; prompt: string };
  if (!text?.trim()) {
    return new NextResponse('', { headers: { 'Content-Type': 'text/plain' } });
  }

  const fullPrompt = `${prompt}

Dictated text:
"""
${text}
"""

Refined text:`;

  try {
    const result = await askClaude(fullPrompt, { maxTokens: Math.min(8192, Math.max(2048, Math.ceil(text.split(/\s+/).length * 1.5))) });
    // If Claude returns EMPTY, it means no meaningful content
    if (result.trim() === 'EMPTY') {
      return new NextResponse(text, { headers: { 'Content-Type': 'text/plain' } });
    }
    return new NextResponse(result, { headers: { 'Content-Type': 'text/plain' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
