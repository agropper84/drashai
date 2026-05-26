import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getClient, MODELS } from '@/lib/ai';

const CATEGORIES = ['Sermon', 'Eulogy', 'Teaching', 'Personal', 'Torah', 'Story', 'Quote'];

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { body } = await req.json();
    if (!body || body.length < 4) return NextResponse.json({ category: 'Uncategorized' });

    const client = await getClient();
    const res = await client.messages.create({
      model: MODELS.HAIKU,
      max_tokens: 8,
      temperature: 0,
      messages: [{
        role: 'user',
        content: `Classify this spark into ONE category. Reply with only the category name.\n\nCategories: ${CATEGORIES.join(', ')}, Uncategorized\n\nSpark: "${body}"\n\nCategory:`,
      }],
    });

    const raw = res.content[0].type === 'text' ? res.content[0].text.trim().replace(/[.\s]+$/g, '') : '';
    const match = CATEGORIES.find(c => c.toLowerCase() === raw.toLowerCase());
    return NextResponse.json({ category: match || 'Uncategorized' });
  } catch {
    return NextResponse.json({ category: 'Uncategorized' });
  }
}
