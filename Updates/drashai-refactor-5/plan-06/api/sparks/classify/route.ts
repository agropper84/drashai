// Plan 6 — best-effort auto-categorization. Adapt to your Anthropic client.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { askClaude } from '@/lib/ai'; // adjust to your wrapper

const CATEGORIES = ['Sermon', 'Eulogy', 'Teaching', 'Personal', 'Torah', 'Story', 'Quote'];

const PROMPT = (body: string) => `Classify the following spark (a brief pastoral note) into ONE of these categories. Reply with only the category name, nothing else.

Categories: ${CATEGORIES.join(', ')}, or "Uncategorized" if none clearly fits.

Spark:
"""
${body}
"""

Category:`;

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { body } = (await req.json()) as { body: string };
  if (!body || body.length < 4) {
    return NextResponse.json({ category: 'Uncategorized' });
  }

  try {
    const raw = await askClaude(PROMPT(body), { maxTokens: 8 });
    const trimmed = raw.trim().replace(/[.\s]+$/g, '');
    const match = CATEGORIES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
    return NextResponse.json({ category: match || 'Uncategorized' });
  } catch {
    return NextResponse.json({ category: 'Uncategorized' });
  }
}
