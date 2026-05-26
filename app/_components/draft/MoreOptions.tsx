'use client';
// Disclosure that hides power-user controls behind a single click:
//   - Document type (sermon / eulogy / teaching / ...)
//   - Freeform instructions
//   - Preserve-level fine-tune (only for stops 2 & 3)

import { useState } from 'react';
import { descriptorFor, VoiceStop } from '@/app/_lib/voice-mode';

export interface MoreOptionsProps {
  voiceStop: VoiceStop;
  draftType: string;
  setDraftType: (v: string) => void;
  instructions: string;
  setInstructions: (v: string) => void;
  preserveOverride?: number;
  setPreserveOverride: (v: number | undefined) => void;
}

const DRAFT_TYPES = [
  { key: 'sermon', label: 'Sermon' },
  { key: 'eulogy', label: 'Eulogy' },
  { key: 'teaching', label: 'Teaching' },
  { key: 'dvar_torah', label: "D'var Torah" },
  { key: 'pastoral_letter', label: 'Pastoral Letter' },
  { key: 'meeting_summary', label: 'Summary' },
];

const PRESERVE_LABELS = ['', 'Loose', 'Ideas', 'Balanced', 'Close', 'Exact'];

export function MoreOptions(props: MoreOptionsProps) {
  const [open, setOpen] = useState(false);
  const d = descriptorFor(props.voiceStop);

  return (
    <div className="more-options">
      <button
        type="button"
        className="more-options-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}>
        <span className={`more-options-chev${open ? ' open' : ''}`}>▸</span>
        More options
      </button>

      {open && (
        <div className="more-options-body">
          <div className="more-options-section">
            <div className="more-options-label">Document type</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {DRAFT_TYPES.map((t) => (
                <button
                  key={t.key}
                  className={`btn small ${props.draftType === t.key ? 'primary' : 'ghost'}`}
                  style={{ justifyContent: 'flex-start', fontSize: 12 }}
                  onClick={() => props.setDraftType(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="more-options-section">
            <div className="more-options-label">Instructions</div>
            <textarea
              className="input serif"
              rows={3}
              value={props.instructions}
              onChange={(e) => props.setInstructions(e.target.value)}
              placeholder="e.g. Keep under 700 words. Open with a question."
            />
          </div>

          {d.preserveAdjustable && (
            <div className="more-options-section">
              <div className="more-options-label">
                Preserve my words
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                  color: 'var(--ink-3)', marginLeft: 8,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  {PRESERVE_LABELS[props.preserveOverride ?? d.preserveLevel]}
                </span>
              </div>
              <div className="settings-help" style={{ marginBottom: 6 }}>
                Override how closely the AI sticks to what you wrote. Loose = rewrite freely;
                Exact = only refine and complete.
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={props.preserveOverride ?? d.preserveLevel}
                onChange={(e) => props.setPreserveOverride(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              {props.preserveOverride != null && (
                <button
                  type="button"
                  className="btn ghost small"
                  style={{ marginTop: 6, fontSize: 11 }}
                  onClick={() => props.setPreserveOverride(undefined)}>
                  Reset to default
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
