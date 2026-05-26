'use client';

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
  const [open, setOpen] = useState(false);

  const save = () => {
    const t = text.trim();
    if (!t) return;
    if (dest === 'spark') onSpark?.(t);
    else if (dest === 'insight') onInsight?.(t);
    else onTask?.(t);
    setText('');
  };

  const visible = open || alwaysVisible;

  return (
    <div
      className="sticky-trigger"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { if (!text.trim()) setOpen(false); }}
    >
      {!visible && <div className="sticky-dot" />}

      {visible && (
        <div className="sticky-hover always-open" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Quick note..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
              if (e.key === 'Escape') { setText(''); setOpen(false); }
            }}
          />
          <div className="row">
            {(['spark', 'insight', 'task'] as Dest[]).map((d) => (
              <button key={d} type="button" className={dest === d ? 'active' : ''} onClick={() => setDest(d)}>
                {d[0].toUpperCase() + d.slice(1)}
              </button>
            ))}
            <button type="button" onClick={save} title="Save (⌘↵)"
              style={{ background: text.trim() ? 'rgba(122,46,42,0.85)' : 'transparent', color: text.trim() ? '#fff' : undefined }}>
              ↵
            </button>
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 8, letterSpacing: '0.06em', color: 'rgba(58,45,28,0.4)', marginTop: 3, textAlign: 'right' }}>
            ⌘↵ to save
          </div>
        </div>
      )}
    </div>
  );
}
