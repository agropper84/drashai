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

    // 1. Try direct reference lookup only if query looks like a ref (contains numbers or known book names)
    const looksLikeRef = /\d/.test(q) || /^(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Psalms|Proverbs|Isaiah|Jeremiah|Ezekiel|Job|Ecclesiastes|Song of Songs|Ruth|Lamentations|Daniel|Esther|Nehemiah|Chronicles|Samuel|Kings|Joshua|Judges|Pirkei Avot|Mishnah|Berakhot|Shabbat|Sanhedrin)/i.test(q);
    if (looksLikeRef) {
      try {
        const refUrl = `https://www.sefaria.org/api/texts/${encodeURIComponent(q)}?context=0&pad=0`;
        const refRes = await fetch(refUrl);
        if (refRes.ok) {
          const data = await refRes.json();
          const flat = (v: any): string => {
            if (!v) return '';
            if (typeof v === 'string') return v.replace(/<[^>]*>/g, '');
            if (Array.isArray(v)) return v.map(flat).filter(Boolean).join(' ');
            return '';
          };
          const heText = flat(data.he);
          const enText = flat(data.text);
          // Only return if we got actual text content
          if (data.ref && (heText.length > 10 || enText.length > 10)) {
            return NextResponse.json({
              results: [{
                ref: data.ref,
                heRef: data.heRef || '',
                he: heText,
                en: enText,
                categories: data.categories || [],
              }],
            });
          }
        }
      } catch (e) {
        console.log('[Sources] Ref lookup failed, trying search:', e);
      }
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

    // Try multiple Sefaria search endpoints
    let hits: any[] = [];

    // Attempt 1: search-wrapper POST
    try {
      const searchRes = await fetch('https://www.sefaria.org/api/search-wrapper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchBody),
      });
      const rawText = await searchRes.text();
      console.log('[Sources] search-wrapper status:', searchRes.status, 'body length:', rawText.length, 'first 200:', rawText.substring(0, 200));
      if (searchRes.ok) {
        const data = JSON.parse(rawText);
        hits = data.hits?.hits || [];
      }
    } catch (e: any) {
      console.error('[Sources] search-wrapper failed:', e.message);
    }

    // Attempt 2: If no hits, try the GET search endpoint
    if (hits.length === 0) {
      try {
        const getUrl = `https://www.sefaria.org/api/search/text/${encodeURIComponent(q)}?size=${size}`;
        console.log('[Sources] Trying GET fallback:', getUrl);
        const getRes = await fetch(getUrl);
        const rawText = await getRes.text();
        console.log('[Sources] GET fallback status:', getRes.status, 'first 200:', rawText.substring(0, 200));
        if (getRes.ok) {
          const data = JSON.parse(rawText);
          hits = data.hits?.hits || [];
        }
      } catch (e: any) {
        console.error('[Sources] GET fallback failed:', e.message);
      }
    }

    // Attempt 3: If still no hits, try Sefaria's newer search endpoint
    if (hits.length === 0) {
      try {
        const v3Url = `https://www.sefaria.org/api/search/merged/${encodeURIComponent(q)}?size=${size}&type=text`;
        console.log('[Sources] Trying v3 merged search:', v3Url);
        const v3Res = await fetch(v3Url);
        const rawText = await v3Res.text();
        console.log('[Sources] v3 merged status:', v3Res.status, 'first 200:', rawText.substring(0, 200));
        if (v3Res.ok) {
          const data = JSON.parse(rawText);
          hits = data.hits?.hits || data.text?.hits?.hits || [];
        }
      } catch (e: any) {
        console.error('[Sources] v3 merged failed:', e.message);
      }
    }

    console.log('[Sources] Total hits:', hits.length);

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
