/**
 * Sefaria API proxy — search Jewish texts
 * Uses Sefaria's free public API (no key required)
 *
 * Two modes:
 * 1. Text search: POST to Sefaria's Elasticsearch endpoint for topic/keyword search
 * 2. Ref lookup: GET from Sefaria's texts API for direct references (Genesis 1:1)
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

    // First try direct reference lookup (e.g., "Genesis 1:1", "Psalms 23")
    const refRes = await fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(q)}?version=primary&language=bilingual`, {
      headers: { 'Accept': 'application/json' },
    }).catch(() => null);

    if (refRes?.ok) {
      const data = await refRes.json();
      if (data.versions && data.versions.length > 0) {
        // It's a valid ref — extract text
        const heText = data.versions.find((v: any) => v.language === 'he')?.text;
        const enText = data.versions.find((v: any) => v.language === 'en')?.text;

        const flattenText = (t: any): string => {
          if (!t) return '';
          if (typeof t === 'string') return t.replace(/<[^>]*>/g, '');
          if (Array.isArray(t)) return t.map(flattenText).filter(Boolean).join(' ');
          return '';
        };

        const results = [{
          ref: data.ref || q,
          heRef: data.heRef || '',
          he: flattenText(heText),
          en: flattenText(enText),
          categories: data.categories || [],
        }];

        // If it's a chapter/section, also get the index for related texts
        return NextResponse.json({ results });
      }
    }

    // Topic/keyword search via Sefaria search API
    const searchBody = {
      query: q,
      type: 'text',
      field: 'naive_lemmatizer',
      size,
      sort_type: 'relevance',
      ...(category && CATEGORY_FILTERS[category] ? { applied_filters: CATEGORY_FILTERS[category] } : {}),
    };

    const searchRes = await fetch('https://www.sefaria.org/api/search-wrapper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(searchBody),
    });

    if (!searchRes.ok) {
      // Fallback: try the older GET search endpoint
      const fallbackUrl = `https://www.sefaria.org/api/search/text/${encodeURIComponent(q)}?size=${size}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        const hits = data.hits?.hits || [];
        return NextResponse.json({
          results: hits.map((hit: any) => {
            const src = hit._source || {};
            return {
              ref: src.ref || '',
              heRef: src.heRef || '',
              he: (src.exact || src.naive_lemmatizer || '').replace(/<[^>]*>/g, ''),
              en: '',
              categories: src.path ? src.path.split('/') : [],
            };
          }).filter((r: any) => r.ref),
        });
      }
      return NextResponse.json({ results: [] });
    }

    const data = await searchRes.json();
    const hits = data.hits?.hits || [];

    // For each hit, try to get the English translation too
    const results = await Promise.all(
      hits.slice(0, size).map(async (hit: any) => {
        const src = hit._source || {};
        const heText = (src.exact || src.naive_lemmatizer || '').replace(/<[^>]*>/g, '');
        const ref = src.ref || '';

        // Try to fetch English translation for this ref
        let enText = '';
        if (ref) {
          try {
            const textRes = await fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=primary&language=en`, {
              signal: AbortSignal.timeout(3000),
            });
            if (textRes.ok) {
              const textData = await textRes.json();
              const enVersion = textData.versions?.find((v: any) => v.language === 'en');
              if (enVersion?.text) {
                const flat = (t: any): string => {
                  if (typeof t === 'string') return t.replace(/<[^>]*>/g, '');
                  if (Array.isArray(t)) return t.map(flat).filter(Boolean).join(' ');
                  return '';
                };
                enText = flat(enVersion.text);
                // Truncate long texts
                if (enText.length > 500) enText = enText.substring(0, 500) + '...';
              }
            }
          } catch {} // timeout/error — just skip English
        }

        return {
          ref,
          heRef: src.heRef || '',
          he: heText.length > 500 ? heText.substring(0, 500) + '...' : heText,
          en: enText,
          categories: src.path ? src.path.split('/') : [],
          highlight: hit.highlight?.exact?.[0]?.replace(/<[^>]*>/g, '') || '',
        };
      })
    );

    return NextResponse.json({ results: results.filter((r: any) => r.ref) });
  } catch (e: any) {
    console.error('[Sources] Sefaria error:', e.message);
    return NextResponse.json({ results: [], error: e.message });
  }
}
