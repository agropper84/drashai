'use client';
// Streaming translation wrapper. Caches per (text, direction) so flipping
// back and forth is instant.

import { useEffect, useRef, useState } from 'react';
import { api } from '@/app/_lib/api';

export type Direction = 'he-en' | 'en-he' | 'auto';

const cache = new Map<string, string>();

export function useTranslation(text: string, direction: Direction = 'auto') {
  const [translated, setTranslated] = useState<string>(() => cache.get(text + '|' + direction) || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!text || !text.trim()) {
      setTranslated('');
      return;
    }
    const key = text + '|' + direction;
    const cached = cache.get(key);
    if (cached) {
      setTranslated(cached);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setTranslated('');

    (async () => {
      try {
        const out = await api.translate(text, direction, controller.signal);
        cache.set(key, out);
        if (!controller.signal.aborted) setTranslated(out);
      } catch (e: unknown) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'unknown error');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [text, direction]);

  return { translated, loading, error };
}
