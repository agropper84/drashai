/**
 * Sefaria API proxy — search Jewish texts
 * Uses Sefaria's free public API (no key required)
 * Docs: https://developers.sefaria.org/
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const q = req.nextUrl.searchParams.get('q') || '';
    const category = req.nextUrl.searchParams.get('category') || '';

    if (!q.trim()) return NextResponse.json({ results: [] });

    // Try Sefaria text search first
    const searchUrl = `https://www.sefaria.org/api/search-wrapper/text/${encodeURIComponent(q)}?size=10&applied_filters=${category ? encodeURIComponent(category) : ''}`;
    const res = await fetch(searchUrl, { headers: { 'Accept': 'application/json' } });

    if (!res.ok) {
      // Fallback: try ref lookup (e.g., "Genesis 1:1")
      const refRes = await fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(q)}?context=0&pad=0`);
      if (refRes.ok) {
        const data = await refRes.json();
        return NextResponse.json({
          results: [{
            ref: data.ref || q,
            heRef: data.heRef || '',
            he: Array.isArray(data.he) ? data.he.join(' ') : (data.he || ''),
            en: Array.isArray(data.text) ? data.text.join(' ') : (data.text || ''),
            categories: data.categories || [],
          }],
        });
      }
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();
    const hits = data.hits?.hits || [];

    const results = hits.map((hit: any) => {
      const src = hit._source || {};
      return {
        ref: src.ref || '',
        heRef: src.heRef || '',
        he: (src.exact || src.naive_lemmatizer || '').replace(/<[^>]*>/g, ''),
        en: (src.exact || '').replace(/<[^>]*>/g, ''),
        categories: src.path ? src.path.split('/') : [],
      };
    }).filter((r: any) => r.ref);

    return NextResponse.json({ results });
  } catch (e: any) {
    console.error('[Sources] Sefaria error:', e.message);
    return NextResponse.json({ results: [], error: e.message });
  }
}
