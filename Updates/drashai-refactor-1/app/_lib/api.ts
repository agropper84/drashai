// Typed fetch wrappers. Replaces ~40 inline fetch() calls scattered through old page.tsx.
import type { Encounter, LibraryResult } from './types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}${text ? ': ' + text : ''}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  encounters: {
    list: () =>
      fetch('/api/rav/encounters').then(json<{ encounters: Encounter[] }>),
    create: (body: Partial<Encounter>) =>
      fetch('/api/rav/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(json<{ encounter: Encounter }>),
    patch: (id: string, body: Record<string, unknown>) =>
      fetch(`/api/rav/encounters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(json<{ encounter: Encounter }>),
    delete: (id: string) =>
      fetch(`/api/rav/encounters/${id}`, { method: 'DELETE' }),
  },
  settings: {
    get: () =>
      fetch('/api/settings').then(json<{ hasClaudeKey: boolean; name?: string }>),
    save: (body: Record<string, string>) =>
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
  },
  sources: {
    search: (q: string, category?: string) => {
      const params = new URLSearchParams({ q, size: '20' });
      if (category && category !== 'all') params.set('category', category);
      return fetch(`/api/sources?${params}`).then(json<{ results?: LibraryResult[]; error?: string }>);
    },
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
};
