/**
 * Sefaria API wrapper with Redis caching.
 * All functions return LibraryResult[] for uniformity.
 */

import { getRedis } from './kv';
import crypto from 'crypto';

export interface SefariaResult {
  ref: string;
  heRef: string;
  he: string;
  en: string;
  categories: string[];
}

function cacheKey(prefix: string, input: string): string {
  const hash = crypto.createHash('sha256').update(input).digest('hex').slice(0, 16);
  return `sefaria:${prefix}:${hash}`;
}

async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const redis = getRedis();
  try {
    const val = await redis.get(key);
    if (val) return JSON.parse(val) as T;
  } catch {}
  const result = await fn();
  try {
    await redis.set(key, JSON.stringify(result), 'EX', ttlSeconds);
  } catch {}
  return result;
}

/** Keyword search via Sefaria's search-wrapper. Cached 1hr. */
export async function searchKeyword(query: string, size = 20): Promise<SefariaResult[]> {
  const key = cacheKey('kw', `${query}|${size}`);
  return cached(key, 3600, async () => {
    const res = await fetch('https://www.sefaria.org/api/search-wrapper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        type: 'text',
        field: 'naive_lemmatizer',
        size,
        sort_type: 'relevance',
        source_proj: true,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const hits = data.hits?.hits || [];
    return hits
      .map((hit: any) => {
        const s = hit._source || {};
        return {
          ref: s.ref || '',
          heRef: s.heRef || '',
          he: (s.exact || s.naive_lemmatizer || '').replace(/<[^>]*>/g, '').substring(0, 400),
          en: (hit.highlight?.naive_lemmatizer?.[0] || '')
            .replace(/<\/?b>/g, '**')
            .replace(/<[^>]*>/g, '')
            .substring(0, 400),
          categories: s.path ? s.path.split('/') : [],
        };
      })
      .filter((r: SefariaResult) => r.ref);
  });
}

/** Fetch full text of a specific reference. Cached 24hr. */
export async function fetchText(ref: string): Promise<SefariaResult | null> {
  const key = cacheKey('txt', ref);
  return cached(key, 86400, async () => {
    const encoded = encodeURIComponent(ref);
    const res = await fetch(`https://www.sefaria.org/api/v3/texts/${encoded}?version=primary`);
    if (!res.ok) return null;
    const data = await res.json();

    // v3 returns versions array; extract primary text
    const heVersions = data.versions?.filter((v: any) => v.language === 'he') || [];
    const enVersions = data.versions?.filter((v: any) => v.language === 'en') || [];
    const heText = heVersions[0]?.text || '';
    const enText = enVersions[0]?.text || '';

    // Text can be string or nested array — flatten
    const flatten = (t: any): string => {
      if (typeof t === 'string') return t.replace(/<[^>]*>/g, '');
      if (Array.isArray(t)) return t.map(flatten).join(' ');
      return '';
    };

    return {
      ref: data.ref || ref,
      heRef: data.heRef || '',
      he: flatten(heText).substring(0, 400),
      en: flatten(enText).substring(0, 400),
      categories: data.categories || [],
    };
  });
}

/** Fetch topic and return related source refs. Cached 6hr. */
export async function fetchTopic(slug: string): Promise<SefariaResult[]> {
  const key = cacheKey('topic', slug);
  return cached(key, 21600, async () => {
    const res = await fetch(`https://www.sefaria.org/api/topics/${encodeURIComponent(slug)}`);
    if (!res.ok) return [];
    const data = await res.json();

    // Extract source refs from the topic
    const refs: string[] = [];
    for (const link of data.refs?.about?.source || []) {
      if (link.ref) refs.push(link.ref);
    }
    // Also check the simpler format
    if (data.sources) {
      for (const s of data.sources) {
        if (s.ref) refs.push(s.ref);
      }
    }

    // Fetch up to 8 texts in parallel
    const texts = await Promise.all(
      refs.slice(0, 8).map((r) => fetchText(r).catch(() => null))
    );
    return texts.filter((t): t is SefariaResult => t !== null);
  });
}

/** Fetch related/linked texts for a reference. Cached 6hr. */
export async function fetchRelated(ref: string): Promise<SefariaResult[]> {
  const key = cacheKey('rel', ref);
  return cached(key, 21600, async () => {
    const encoded = encodeURIComponent(ref);
    const res = await fetch(`https://www.sefaria.org/api/related/${encoded}`);
    if (!res.ok) return [];
    const data = await res.json();

    // Extract linked refs from various link types
    const refs: string[] = [];
    for (const link of data.links || []) {
      if (link.ref) refs.push(link.ref);
      else if (link.sourceRef) refs.push(link.sourceRef);
    }

    // Fetch up to 5 related texts in parallel
    const texts = await Promise.all(
      refs.slice(0, 5).map((r) => fetchText(r).catch(() => null))
    );
    return texts.filter((t): t is SefariaResult => t !== null);
  });
}
