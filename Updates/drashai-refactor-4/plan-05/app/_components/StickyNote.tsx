'use client';
// Plan 5 — adds a tiny keyboard hint so first-time users discover Cmd+Enter.

import { useState } from 'react';

export interface StickyNoteProps {
  onSpark?: (text: string) => void;
  onInsight?: (text: string) => void;
  onTask?: (text: string) => void;
  alwaysVisible?: boolean;
}

type Dest = 'spark' | 'insight' | 'task';

export function StickyNote({ onSpark, onInsight, onTask, alwaysVisible }: StickyNoteProps) {
  const [text, setText] = useState('');
  const [dest, setDest] = useState<Dest>('spark');

  const save = () => {
    const t = text.trim();
    if (!t) return;
    if (dest === 'spark') onSpark?.(t);
    else if (dest === 'insight') onInsight?.(t);
    else onTask?.(t);
    setText('');
  };

  return (
    <div className={'sticky-hover' + (alwaysVisible ? ' always-open' : '')} onClick={(e) => e.stopPropagation()}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Quick thought, task, or spark..."
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save(); }}
      />
      <div className="row">
        {(['spark', 'insight', 'task'] as Dest[]).map((d) => (
          <button
            key={d}
            type="button"
            className={dest === d ? 'active' : ''}
            onClick={() => setDest(d)}>
            {d[0].toUpperCase() + d.slice(1)}
          </button>
        ))}
        <button
          type="button"
          onClick={save}
          title="Save (⌘↵)"
          style={{
            background: text.trim() ? 'rgba(122, 46, 42, 0.85)' : 'transparent',
            color: text.trim() ? '#fff' : undefined,
            fontWeight: text.trim() ? 600 : 400,
          }}>↵</button>
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9, letterSpacing: '0.06em',
        color: 'rgba(58, 45, 28, 0.45)',
        marginTop: 4,
        textAlign: 'right',
      }}>
        ⌘↵ to save
      </div>
    </div>
  );
}
