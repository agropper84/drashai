// Plan 6 — adds api.sparks. Otherwise identical to Plan 5.

import type { Encounter, LibraryResult, Spark } from './types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? ': ' + text : ''}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  encounters: {
    list: (opts?: { includeArchived?: boolean }) => {
      const qs = opts?.includeArchived ? '?includeArchived=true' : '';
      return fetch(`/api/rav/encounters${qs}`).then(json<{ encounters: Encounter[] }>);
    },
    create: (body: Partial<Encounter>) =>
      fetch('/api/rav/encounters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(json<{ encounter: Encounter }>),
    patch: (id: string, body: Record<string, unknown>) =>
      fetch(`/api/rav/encounters/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(json<{ encounter: Encounter }>),
    archive: (id: string) =>
      fetch(`/api/rav/encounters/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: true }),
      }).then(json<{ encounter: Encounter }>),
    unarchive: (id: string) =>
      fetch(`/api/rav/encounters/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unarchive: true }),
      }).then(json<{ encounter: Encounter }>),
    delete: (id: string) =>
      fetch(`/api/rav/encounters/${id}`, { method: 'DELETE' }),
  },

  sparks: {
    list: (opts?: { fileId?: string | 'unassigned' }) => {
      const qs = opts?.fileId ? `?fileId=${encodeURIComponent(opts.fileId)}` : '';
      return fetch(`/api/sparks${qs}`).then(json<{ sparks: Spark[] }>);
    },
    create: (body: Partial<Spark>) =>
      fetch('/api/sparks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(json<{ spark: Spark }>),
    patch: (id: string, body: Record<string, unknown>) =>
      fetch(`/api/sparks/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(json<{ spark: Spark }>),
    delete: (id: string) =>
      fetch(`/api/sparks/${id}`, { method: 'DELETE' }),
    classify: (body: string) =>
      fetch('/api/sparks/classify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      }).then(json<{ category: string }>).catch(() => ({ category: 'Uncategorized' })),
  },

  settings: {
    get: () =>
      fetch('/api/settings').then(json<{ hasClaudeKey: boolean; name?: string }>),
    save: (body: Record<string, string>) =>
      fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
  },
  sources: {
    search: (q: string, category?: string, mode: 'auto' | 'keyword' | 'smart' = 'auto', depth: 'normal' | 'deep' = 'normal') => {
      const params = new URLSearchParams({ q, size: depth === 'deep' ? '30' : '20', mode });
      if (depth === 'deep') params.set('depth', 'deep');
      if (category && category !== 'all') params.set('category', category);
      return fetch(`/api/sources?${params}`).then(json<{ results?: LibraryResult[]; meta?: { mode: string; searches?: string[] }; error?: string }>);
    },
    synthesize: (question: string, sources: { ref: string; he: string; en: string }[]) =>
      fetch('/api/sources/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sources }),
      }),
  },
  transcribe: (audio: Blob, mode = 'encounter') => {
    const form = new FormData();
    form.append('audio', audio, `recording-${Date.now()}.webm`);
    form.append('mode', mode);
    return fetch('/api/transcribe-elevenlabs', { method: 'POST', body: form })
      .then(json<{ text: string }>);
  },
  uploadAudio: (audio: Blob, encounterId: string) => {
    const form = new FormData();
    form.append('audio', audio, `recording-${Date.now()}.webm`);
    form.append('encounterId', encounterId);
    return fetch('/api/upload-audio', { method: 'POST', body: form })
      .then(json<{ url: string }>);
  },
  uploadDocument: (file: File, encounterId: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('encounterId', encounterId);
    return fetch('/api/upload-document', { method: 'POST', body: form })
      .then(json<{ url: string }>);
  },
  generate: (body: Record<string, unknown>) =>
    fetch('/api/rav/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  /** Plan 10 — translation. Returns the full translated text. */
  translate: async (text: string, direction: 'he-en' | 'en-he' | 'auto' = 'auto', signal?: AbortSignal): Promise<string> => {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, direction }),
      signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`${res.status} ${t}`);
    }
    return res.text();
  },
};
