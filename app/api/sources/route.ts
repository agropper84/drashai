/**
 * Sefaria API proxy — search Jewish texts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';

export const maxDuration = 30;

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

    // 1. Try direct reference lookup (e.g., "Genesis 1:1")
    try {
      const refUrl = `https://www.sefaria.org/api/texts/${encodeURIComponent(q)}?context=0&pad=0`;
      const refRes = await fetch(refUrl);
      if (refRes.ok) {
        const data = await refRes.json();
        if (data.ref && (data.he || data.text)) {
          const flat = (v: any): string => {
            if (!v) return '';
            if (typeof v === 'string') return v.replace(/<[^>]*>/g, '');
            if (Array.isArray(v)) return v.map(flat).filter(Boolean).join(' ');
            return '';
          };
          return NextResponse.json({
            results: [{
              ref: data.ref,
              heRef: data.heRef || '',
              he: flat(data.he),
              en: flat(data.text),
              categories: data.categories || [],
            }],
          });
        }
      }
    } catch (e) {
      console.log('[Sources] Ref lookup failed, trying search:', e);
    }

    // 2. Topic/keyword search
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

    console.log('[Sources] Searching Sefaria:', JSON.stringify(searchBody));

    const searchRes = await fetch('https://www.sefaria.org/api/search-wrapper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchBody),
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text().catch(() => '');
      console.error('[Sources] Sefaria search failed:', searchRes.status, errText);
      return NextResponse.json({ results: [], error: `Sefaria returned ${searchRes.status}` });
    }

    const data = await searchRes.json();
    const hits = data.hits?.hits || [];

    console.log('[Sources] Got', hits.length, 'hits');

    const results = hits.map((hit: any) => {
      const src = hit._source || {};
      const highlightHe = (src.exact || src.naive_lemmatizer || '').replace(/<[^>]*>/g, '');
      const highlightEn = (hit.highlight?.naive_lemmatizer?.[0] || hit.highlight?.exact?.[0] || '').replace(/<\/?b>/g, '**').replace(/<[^>]*>/g, '');
      return {
        ref: src.ref || '',
        heRef: src.heRef || '',
        he: highlightHe.substring(0, 400),
        en: highlightEn.substring(0, 400),
        categories: src.path ? src.path.split('/') : [],
      };
    }).filter((r: any) => r.ref);

    return NextResponse.json({ results });
  } catch (e: any) {
    console.error('[Sources] Error:', e);
    return NextResponse.json({ results: [], error: e.message });
  }
}
