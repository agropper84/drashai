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
    addFile: (projectId: string, file: File, type = 'pdf', title?: string) => {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      if (title) form.append('title', title);
      return fetch(`/api/studyo/materials?projectId=${projectId}`, {
        method: 'POST',
        body: form,
      }).then(json<{ material: any; project: StudyoProject }>);
    },
    addText: (projectId: string, content: string, title?: string) =>
      fetch(`/api/studyo/materials?projectId=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'text', content, title }),
      }).then(json<{ material: any; project: StudyoProject }>),
    addLink: (projectId: string, url: string, title?: string) =>
      fetch(`/api/studyo/materials?projectId=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'link', url, title }),
      }).then(json<{ material: any; project: StudyoProject }>),
    remove: (id: string, projectId: string) =>
      fetch(`/api/studyo/materials/${id}?projectId=${projectId}`, { method: 'DELETE' }).then(json<{ ok: boolean }>),
  },
  outputs: {
    get: (id: string, projectId: string) =>
      fetch(`/api/studyo/outputs/${id}?projectId=${projectId}`).then(json<{ output: any }>),
    remove: (id: string, projectId: string) =>
      fetch(`/api/studyo/outputs/${id}?projectId=${projectId}`, { method: 'DELETE' }).then(json<{ ok: boolean }>),
  },
};
