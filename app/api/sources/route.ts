import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';

export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q') || '';
  const size = parseInt(req.nextUrl.searchParams.get('size') || '20');
  if (!q.trim()) return NextResponse.json({ results: [] });

  try {
    const res = await fetch('https://www.sefaria.org/api/search-wrapper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q, type: 'text', field: 'naive_lemmatizer', size, sort_type: 'relevance' }),
    });

    if (!res.ok) return NextResponse.json({ results: [], error: `Sefaria ${res.status}` });

    const data = await res.json();
    const hits = data.hits?.hits || [];

    const results = hits.map((hit: any) => {
      const s = hit._source || {};
      return {
        ref: s.ref || '',
        heRef: s.heRef || '',
        he: (s.exact || s.naive_lemmatizer || '').replace(/<[^>]*>/g, '').substring(0, 400),
        en: (hit.highlight?.naive_lemmatizer?.[0] || '').replace(/<\/?b>/g, '**').replace(/<[^>]*>/g, '').substring(0, 400),
        categories: s.path ? s.path.split('/') : [],
      };
    }).filter((r: any) => r.ref);

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e.message });
  }
}
