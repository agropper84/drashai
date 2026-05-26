'use client';
// Plan 6 — server-backed sparks store. Mirrors encounters-store shape so
// patterns are consistent across the app.

import {
  createContext, ReactNode, useCallback, useContext, useEffect, useState,
} from 'react';
import { api } from './api';
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
  loading: boolean;
  refresh: () => Promise<void>;
  create: (body: Partial<Spark>) => Promise<Spark>;
  patch: (id: string, body: Record<string, unknown>) => Promise<Spark | null>;
  remove: (id: string) => Promise<void>;
  /** Convenience: assign or unassign from a file. */
  assignToFile: (id: string, fileId: string | null) => Promise<void>;
}

const Ctx = createContext<SparksStore | null>(null);

export function SparksProvider({ children }: { children: ReactNode }) {
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.sparks.list();
      setSparks(data.sparks || []);
    } catch (err) {
      console.error('[sparks] refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create: SparksStore['create'] = async (body) => {
    // Optimistic: create on the server, then merge.
    const { spark } = await api.sparks.create(body);
    setSparks((prev) => [spark, ...prev]);

    // Best-effort auto-categorize (doesn't block).
    if (!spark.category && spark.body) {
      api.sparks.classify(spark.body).then(async ({ category }) => {
        if (!category || category === 'Uncategorized') return;
        const updated = await api.sparks.patch(spark.id, { category });
        setSparks((prev) => prev.map((s) => (s.id === spark.id ? updated.spark : s)));
      }).catch(() => {});
    }

    return spark;
  };

  const patch: SparksStore['patch'] = async (id, body) => {
    // Optimistic: update locally, then reconcile with server response.
    setSparks((prev) => prev.map((s) => (s.id === id ? { ...s, ...body } as Spark : s)));
    try {
      const { spark } = await api.sparks.patch(id, body);
      setSparks((prev) => prev.map((s) => (s.id === id ? spark : s)));
      return spark;
    } catch (err) {
      console.error('[sparks] patch failed:', err);
      refresh(); // rollback by re-fetching
      return null;
    }
  };

  const remove: SparksStore['remove'] = async (id) => {
    setSparks((prev) => prev.filter((s) => s.id !== id));
    try {
      await api.sparks.delete(id);
    } catch (err) {
      console.error('[sparks] delete failed:', err);
      refresh();
    }
  };

  const assignToFile: SparksStore['assignToFile'] = async (id, fileId) => {
    await patch(id, fileId ? { fileId } : { fileId: null });
  };

  return (
    <Ctx.Provider value={{ sparks, loading, refresh, create, patch, remove, assignToFile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSparks() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSparks must be used inside <SparksProvider>');
  return ctx;
}
