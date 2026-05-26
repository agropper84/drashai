'use client';
// Global Zen mode hook. Owns the shortcut, persistence, and the "default on
// for new files" preference.

import { useEffect, useState } from 'react';

const STORAGE_KEY_ENABLED = 'drashai.zen.enabled';
const STORAGE_KEY_DEFAULT = 'drashai.zen.defaultForDraft';

export function useZenMode(initial?: boolean) {
  const [zen, setZen] = useState<boolean>(initial ?? false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY_ENABLED);
    if (stored !== null) setZen(stored === '1');
    else if (initial == null) {
      const def = localStorage.getItem(STORAGE_KEY_DEFAULT) === '1';
      setZen(def);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist on change.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ENABLED, zen ? '1' : '0');
  }, [zen]);

  // Cmd/Ctrl + .
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault();
        setZen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return { zen, setZen, toggle: () => setZen((v) => !v) };
}

export function getZenDefault(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY_DEFAULT) === '1';
}

export function setZenDefault(on: boolean) {
  localStorage.setItem(STORAGE_KEY_DEFAULT, on ? '1' : '0');
}
