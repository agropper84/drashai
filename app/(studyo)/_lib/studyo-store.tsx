'use client';
// Context provider for Studyo project state. Follows the encounters-store pattern.

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { studyoApi } from './studyo-api';
import type { StudyoProject } from './studyo-types';

interface StudyoStore {
  projects: StudyoProject[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (data: Partial<StudyoProject>) => Promise<StudyoProject>;
  update: (id: string, data: Partial<StudyoProject>) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const Ctx = createContext<StudyoStore | null>(null);

export function StudyoProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<StudyoProject[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { projects } = await studyoApi.projects.list();
      setProjects(projects);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (data: Partial<StudyoProject>) => {
    const { project } = await studyoApi.projects.create(data);
    setProjects(prev => [project, ...prev]);
    return project;
  }, []);

  const update = useCallback(async (id: string, data: Partial<StudyoProject>) => {
    await studyoApi.projects.update(id, data);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    await studyoApi.projects.remove(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ projects, loading, refresh, create, update, remove }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStudyo() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStudyo must be used inside <StudyoProvider>');
  return ctx;
}
