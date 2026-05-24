'use client';
// Hover-revealed sticky note. Wrap any element in a <div class="card-host"> and drop
// <StickyNote> inside as a sibling. It absolute-positions to the top-right corner.

import { useState } from 'react';

export interface StickyNoteProps {
  /** Capture as a global spark (no fileId). */
  onSpark?: (text: string) => void;
  /** Capture as an insight for the host file. */
  onInsight?: (text: string) => void;
  /** Capture as a task on the host file. */
  onTask?: (text: string) => void;
  /** Force open (e.g. for keyboard focus / testing). */
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
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
        }}
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
          style={{
            background: text.trim() ? 'rgba(122, 46, 42, 0.85)' : 'transparent',
            color: text.trim() ? '#fff' : undefined,
            fontWeight: text.trim() ? 600 : 400,
          }}>↵</button>
      </div>
    </div>
  );
}
