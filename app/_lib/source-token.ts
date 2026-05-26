// Inline source token serialization. Tokens live in the draft as plain text
// so we can stay in a textarea, but render as styled components in preview mode.
//
// Format: {{source:REF|HE|EN}}
// REF, HE, EN are URI-encoded so | and } in the body don't break parsing.

import type { EncounterSource } from './types';

const TOKEN_RE = /\{\{source:([^|}]*)\|([^|}]*)\|([^}]*)\}\}/g;

export function serializeSource(s: Pick<EncounterSource, 'ref' | 'he' | 'en'>): string {
  const ref = encodeURIComponent(s.ref || '');
  const he = encodeURIComponent(s.he || '');
  const en = encodeURIComponent(s.en || '');
  return `{{source:${ref}|${he}|${en}}}`;
}

export interface ParsedSourceToken {
  ref: string;
  he: string;
  en: string;
}

/**
 * Split a draft body into a sequence of plain-text chunks and parsed source
 * tokens, in order. Use this to render mixed content in preview mode.
 */
export interface DraftSegment {
  kind: 'text' | 'source';
  text?: string;
  source?: ParsedSourceToken;
}

export function parseDraft(body: string): DraftSegment[] {
  const segments: DraftSegment[] = [];
  let lastIndex = 0;
  const re = new RegExp(TOKEN_RE.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: body.slice(lastIndex, match.index) });
    }
    segments.push({
      kind: 'source',
      source: {
        ref: decodeURIComponent(match[1]),
        he: decodeURIComponent(match[2]),
        en: decodeURIComponent(match[3]),
      },
    });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) {
    segments.push({ kind: 'text', text: body.slice(lastIndex) });
  }
  return segments;
}

/**
 * Insert a serialized source token at the given caret position in a textarea
 * body. Returns the new body string and the new caret position.
 */
export function insertSourceAt(
  body: string,
  caret: number,
  source: Pick<EncounterSource, 'ref' | 'he' | 'en'>,
): { body: string; caret: number } {
  const token = serializeSource(source);
  const before = body.slice(0, caret);
  const after = body.slice(caret);
  // If there's text immediately before/after and not already a space, add one.
  const prefix = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
  const suffix = after.length > 0 && !/^\s/.test(after) ? ' ' : '';
  const inserted = prefix + token + suffix;
  return { body: before + inserted + after, caret: caret + inserted.length };
}
