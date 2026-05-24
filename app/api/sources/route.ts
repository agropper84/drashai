/**
 * Sefaria API proxy — search Jewish texts
 * Uses Sefaria's free public API (no key required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';

const CATEGORY_FILTERS: Record<string, string[]> = {
  tanakh: ['Tanakh'],
  talmud: ['Talmud'],
  midrash: ['Midrash'],
  commentary: ['Commentary'],
};

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const q = req.nextUrl.searchParams.get('q') || '';
    const category = req.nextUrl.searchParams.get('category') || '';
    const size = parseInt(req.nextUrl.searchParams.get('size') || '20');

    if (!q.trim()) return NextResponse.json({ results: [] });

    // 1. Try direct reference lookup first (e.g., "Genesis 1:1", "Psalms 23")
    try {
      const refRes = await fetch(
        `https://www.sefaria.org/api/texts/${encodeURIComponent(q)}?context=0&pad=0`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (refRes.ok) {
        const data = await refRes.json();
        if (data.ref && (data.he || data.text)) {
          const flatJoin = (v: any): string => {
            if (!v) return '';
            if (typeof v === 'string') return v.replace(/<[^>]*>/g, '');
            if (Array.isArray(v)) return v.map(flatJoin).filter(Boolean).join(' ');
            return '';
          };
          return NextResponse.json({
            results: [{
              ref: data.ref,
              heRef: data.heRef || '',
              he: flatJoin(data.he),
              en: flatJoin(data.text),
              categories: data.categories || [],
            }],
          });
        }
      }
    } catch {} // Not a valid ref — fall through to search

    // 2. Topic/keyword search via Sefaria search API
    const searchBody: Record<string, any> = {
      query: q,
      type: 'text',
      field: 'naive_lemmatizer',
      size,
      sort_type: 'relevance',
    };
    if (category && CATEGORY_FILTERS[category]) {
      searchBody.applied_filters = CATEGORY_FILTERS[category];
    }

    const searchRes = await fetch('https://www.sefaria.org/api/search-wrapper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchBody),
      signal: AbortSignal.timeout(10000),
    });

    if (!searchRes.ok) {
      console.error('[Sources] Sefaria search failed:', searchRes.status);
      return NextResponse.json({ results: [] });
    }

    const data = await searchRes.json();
    const hits = data.hits?.hits || [];

    const results = hits.map((hit: any) => {
      const src = hit._source || {};
      const highlight = hit.highlight?.naive_lemmatizer?.[0] || hit.highlight?.exact?.[0] || '';
      return {
        ref: src.ref || '',
        heRef: src.heRef || '',
        he: (src.exact || src.naive_lemmatizer || '').replace(/<[^>]*>/g, '').substring(0, 400),
        en: highlight.replace(/<\/?b>/g, '').replace(/<[^>]*>/g, '').substring(0, 400),
        categories: src.path ? src.path.split('/') : [],
      };
    }).filter((r: any) => r.ref);

    return NextResponse.json({ results });
  } catch (e: any) {
    console.error('[Sources] Error:', e.message);
    return NextResponse.json({ results: [], error: e.message });
  }
}
