'use client';
// Rail section in the Draft tab listing the file's attached sources.
// Click any source to insert it at the current caret position.

import type { EncounterSource } from '@/app/_lib/types';

export interface AttachedSourcesPanelProps {
  sources: EncounterSource[];
  onPick: (source: EncounterSource) => void;
  onOpenSearch: () => void;
}

export function AttachedSourcesPanel({ sources, onPick, onOpenSearch }: AttachedSourcesPanelProps) {
  return (
    <div className="aside-card">
      <div className="aside-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Attached sources · {sources.length}</span>
        <button
          type="button"
          className="btn ghost small"
          style={{ padding: '2px 8px', fontSize: 11 }}
          onClick={onOpenSearch}>
          + Find
        </button>
      </div>

      {sources.length === 0 ? (
        <div style={{
          fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic',
          fontSize: 13, color: 'var(--ink-3)', padding: '10px 0',
        }}>
          No sources attached yet. Use the Sources tab or press ⌘K while writing.
        </div>
      ) : (
        <div className="attached-sources-list">
          {sources.map((s, i) => (
            <button
              key={i}
              type="button"
              className="attached-source-row"
              onClick={() => onPick(s)}
              title="Insert at cursor">
              <div className="attached-source-ref">{s.ref}</div>
              {s.he && <div className="attached-source-he">{s.he.substring(0, 50)}{s.he.length > 50 ? '…' : ''}</div>}
              {s.en && <div className="attached-source-en">{s.en.substring(0, 70)}{s.en.length > 70 ? '…' : ''}</div>}
            </button>
          ))}
        </div>
      )}

      <div style={{
        marginTop: 10, padding: '8px 10px', borderRadius: 4,
        background: 'var(--bg-sunken)',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
        color: 'var(--ink-3)', letterSpacing: '0.06em',
      }}>
        While writing: <kbd>⌘K</kbd> or type <code>/source</code>
      </div>
    </div>
  );
}
