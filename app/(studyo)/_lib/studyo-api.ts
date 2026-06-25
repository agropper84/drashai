'use client';
// Client-side fetch wrappers for /api/studyo/* endpoints.

import type { StudyoProject } from './studyo-types';

function json<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export const studyoApi = {
  projects: {
    list: () => fetch('/api/studyo/projects').then(json<{ projects: StudyoProject[] }>),
    get: (id: string) => fetch(`/api/studyo/projects/${id}`).then(json<{ project: StudyoProject }>),
    create: (data: Partial<StudyoProject>) =>
      fetch('/api/studyo/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(json<{ project: StudyoProject }>),
    update: (id: string, data: Partial<StudyoProject>) =>
      fetch(`/api/studyo/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(json<{ project: StudyoProject }>),
    remove: (id: string) =>
      fetch(`/api/studyo/projects/${id}`, { method: 'DELETE' }).then(json<{ ok: boolean }>),
  },
  materials: {
    add: (projectId: string, form: FormData) =>
      fetch(`/api/studyo/materials?projectId=${projectId}`, {
        method: 'POST',
        body: form,
      }).then(json<{ material: any }>),
    remove: (id: string, projectId: string) =>
      fetch(`/api/studyo/materials/${id}?projectId=${projectId}`, { method: 'DELETE' }).then(json<{ ok: boolean }>),
  },
};
