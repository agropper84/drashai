'use client';
// Renders a parsed source token as a styled inline blockquote.

import type { ParsedSourceToken } from '@/app/_lib/source-token';

export function InlineSource({ source, onRemove }: { source: ParsedSourceToken; onRemove?: () => void }) {
  return (
    <span className="inline-source" contentEditable={false}>
      <span className="inline-source-cite">{source.ref}</span>
      {source.he && <span className="inline-source-he">{source.he}</span>}
      {source.en && <span className="inline-source-en">{source.en}</span>}
      {onRemove && (
        <button
          type="button"
          className="inline-source-remove"
          onClick={onRemove}
          title="Remove this source"
          aria-label="Remove">
          ×
        </button>
      )}
    </span>
  );
}
