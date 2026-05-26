import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { searchKeyword } from '@/lib/sefaria';
import { classifyQuery, smartSearch, deepSearch } from '@/lib/source-search';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const q = req.nextUrl.searchParams.get('q') || '';
  const size = parseInt(req.nextUrl.searchParams.get('size') || '20');
  const mode = req.nextUrl.searchParams.get('mode') || 'auto';
  const depth = req.nextUrl.searchParams.get('depth') || 'normal';
  if (!q.trim()) return NextResponse.json({ results: [] });

  try {
    // Deep search — thorough multi-layer search with related expansion
    if (depth === 'deep') {
      const { results, meta } = await deepSearch(q, Math.max(size, 30));
      return NextResponse.json({ results, meta });
    }

    // Determine search path
    const effective = mode === 'smart' ? 'smart'
      : mode === 'keyword' ? 'keyword'
      : classifyQuery(q);

    if (effective === 'keyword') {
      const results = await searchKeyword(q, size);
      return NextResponse.json({ results, meta: { mode: 'keyword' } });
    }

    // AI-enhanced smart search
    const { results, meta } = await smartSearch(q, size);
    return NextResponse.json({ results, meta });
  } catch (e: any) {
    return NextResponse.json({ results: [], error: e.message });
  }
}
