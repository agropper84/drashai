'use client';
// Sparks store — global capture inbox + per-file insights.
// In Plan 6 this becomes the single source of truth for both views (filtered).

import { createContext, ReactNode, useContext, useState } from 'react';
import type { Spark } from './types';

export const SPARK_CATEGORIES = [
  'Uncategorized',
  'Sermon',
  'Eulogy',
  'Teaching',
  'Personal',
  'Torah',
  'Story',
  'Quote',
];

interface SparksStore {
  sparks: Spark[];
  setSparks: React.Dispatch<React.SetStateAction<Spark[]>>;
}

const Ctx = createContext<SparksStore | null>(null);

export function SparksProvider({ children }: { children: ReactNode }) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  return <Ctx.Provider value={{ sparks, setSparks }}>{children}</Ctx.Provider>;
}

export function useSparks() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSparks must be used inside <SparksProvider>');
  return ctx;
}
