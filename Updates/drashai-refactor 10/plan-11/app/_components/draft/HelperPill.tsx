'use client';
// Bottom-center floating pill on the Draft tab. Collapsed = invitation
// ("Ask the AI for help with this draft"). Expanded = compact panel with
// 4-stop voice slider, instructions, and Generate.

import { useEffect, useRef, useState } from 'react';
import { toGenerateParams, VOICE_STOPS, VoiceStop } from '@/app/_lib/voice-mode';

const PenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
  </svg>
);

export interface HelperPillProps {
  voiceStop: VoiceStop;
  setVoiceStop: (v: VoiceStop) => void;
  instructions: string;
  setInstructions: (v: string) => void;
  generating: boolean;
  onGenerate: () => void;
  /** External shortcut (⌘J) can force open. */
  open: boolean;
  setOpen: (o: boolean) => void;
}

export function HelperPill({
  voiceStop, setVoiceStop,
  instructions, setInstructions,
  generating, onGenerate,
  open, setOpen,
}: HelperPillProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Outside click closes
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, setOpen]);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const stopLabels = ['My words', 'I lead', 'Co-author', 'AI drafts'];
  const placeholders = [
    'Just fact-check what I wrote.',
    'What should I focus on? e.g. "Open with a question."',
    'Any direction? e.g. "Keep the carob-tree image."',
    'Optional — anything to emphasize?',
  ];
  const buttonLabel = voiceStop === 1 ? 'Check facts' : voiceStop === 4 ? 'Generate draft' : 'Help me write';

  return (
    <div className="fd-helper" ref={ref}>
      {!open ? (
        <button type="button" className="fd-helper-pill" onClick={() => setOpen(true)}>
          <span className="fd-helper-pill-icon"><PenIcon/></span>
          <span className="fd-helper-pill-label">Ask the AI for help with this draft</span>
          <span className="fd-helper-pill-shortcut">⌘J</span>
          <span className="fd-helper-pill-action" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
            Open
          </span>
        </button>
      ) : (
        <div className="fd-helper-panel">
          <div className="fd-helper-panel-head">
            <div className="fd-helper-panel-title">AI helper</div>
            <button type="button" className="fd-helper-panel-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="fd-voice-row">
            {VOICE_STOPS.map((s, i) => (
              <button
                key={s.stop}
                type="button"
                className={`fd-voice-stop${voiceStop === s.stop ? ' active' : ''}`}
                title={s.detail}
                onClick={() => setVoiceStop(s.stop)}>
                {stopLabels[i]}
              </button>
            ))}
          </div>

          <input
            className="fd-helper-input"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={placeholders[voiceStop - 1]}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onGenerate();
            }}
          />

          <div className="fd-helper-actions">
            <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>Cancel</button>
            <button
              type="button"
              className="btn primary small"
              onClick={onGenerate}
              disabled={generating}>
              {generating ? 'Working…' : buttonLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
