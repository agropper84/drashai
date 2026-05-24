'use client';
// Shared client-state store for encounters. Used by Sidebar, Home, every File tab,
// Sparks (assign-to), Library (copy-to-file). Replaces ~6 useState/useEffect calls in old App.

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api } from './api';
import type { Encounter } from './types';

interface EncountersStore {
  encounters: Encounter[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (body: Partial<Encounter>) => Promise<Encounter>;
  patch: (id: string, body: Record<string, unknown>) => Promise<Encounter | null>;
  remove: (id: string) => Promise<void>;
  getById: (id: string) => Encounter | undefined;
}

const Ctx = createContext<EncountersStore | null>(null);

export function EncountersProvider({ children }: { children: ReactNode }) {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.encounters.list();
      setEncounters(data.encounters || []);
    } catch (err) {
      console.error('[encounters] refresh failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create: EncountersStore['create'] = async (body) => {
    const { encounter } = await api.encounters.create(body);
    setEncounters((prev) => [encounter, ...prev]);
    return encounter;
  };

  const patch: EncountersStore['patch'] = async (id, body) => {
    try {
      const { encounter } = await api.encounters.patch(id, body);
      setEncounters((prev) => prev.map((e) => (e.id === id ? encounter : e)));
      return encounter;
    } catch (err) {
      console.error('[encounters] patch failed:', err);
      return null;
    }
  };

  const remove: EncountersStore['remove'] = async (id) => {
    await api.encounters.delete(id);
    setEncounters((prev) => prev.filter((e) => e.id !== id));
  };

  const getById: EncountersStore['getById'] = (id) =>
    encounters.find((e) => e.id === id);

  return (
    <Ctx.Provider value={{ encounters, loading, refresh, create, patch, remove, getById }}>
      {children}
    </Ctx.Provider>
  );
}

export function useEncounters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useEncounters must be used inside <EncountersProvider>');
  return ctx;
}
