'use client';
// Bottom-center floating pill on the Draft tab. Two modes:
//   Generate — source picker, direction fields, 4-stop voice slider → full draft generation
//   Ask      — free-form Q&A for direction, suggestions, sources, structure

import { useEffect, useRef, useState } from 'react';
import { VOICE_STOPS, VoiceStop } from '@/app/_lib/voice-mode';
import type { Encounter, Spark, EncounterSource } from '@/app/_lib/types';

const PenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
  </svg>
);

type HelperTab = 'generate' | 'ask';

export type SourceKey = 'transcript' | 'notes' | 'sources' | 'sparks' | 'draft';

interface SourceInfo {
  key: SourceKey;
  label: string;
  available: boolean;
  detail?: string;
}

export interface HelperPillProps {
  voiceStop: VoiceStop;
  setVoiceStop: (v: VoiceStop) => void;
  instructions: string;
  setInstructions: (v: string) => void;
  generating: boolean;
  onGenerate: (selectedSources: SourceKey[]) => void;
  open: boolean;
  setOpen: (o: boolean) => void;
  /** Context for the ask feature. */
  askContext?: { draft?: string; transcript?: string; notes?: string; type?: string };
  /** Available sources for the source picker. */
  file?: Encounter | null;
  fileSparks?: Spark[];
}

export function HelperPill({
  voiceStop, setVoiceStop,
  instructions, setInstructions,
  generating, onGenerate,
  open, setOpen,
  askContext,
  file,
  fileSparks,
}: HelperPillProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<HelperTab>('generate');
  const [askQuestion, setAskQuestion] = useState('');
  const [askAnswer, setAskAnswer] = useState('');
  const [asking, setAsking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const [selectedSources, setSelectedSources] = useState<Set<SourceKey>>(new Set(['transcript', 'notes', 'sources', 'sparks']));

  // Build source list from the file
  const sources: SourceInfo[] = [
    {
      key: 'transcript',
      label: 'Transcript',
      available: !!file?.transcript?.trim(),
      detail: file?.transcript ? `${file.transcript.split(/\s+/).length} words` : undefined,
    },
    {
      key: 'notes',
      label: 'Notes',
      available: !!file?.notes?.trim(),
      detail: file?.notes ? `${file.notes.split(/\s+/).length} words` : undefined,
    },
    {
      key: 'sources',
      label: 'Sources',
      available: !!(file?.sources?.length),
      detail: file?.sources?.length ? `${file.sources.length} ref${file.sources.length > 1 ? 's' : ''}` : undefined,
    },
    {
      key: 'sparks',
      label: 'Sparks',
      available: !!(fileSparks?.length),
      detail: fileSparks?.length ? `${fileSparks.length} spark${fileSparks.length > 1 ? 's' : ''}` : undefined,
    },
    {
      key: 'draft',
      label: 'My draft',
      available: !!askContext?.draft?.trim(),
      detail: askContext?.draft ? `${askContext.draft.split(/\s+/).filter(Boolean).length} words` : undefined,
    },
  ];

  const toggleSource = (key: SourceKey) => {
    setSelectedSources(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Auto-select available sources on open
  useEffect(() => {
    if (open) {
      const available = sources.filter(s => s.available).map(s => s.key);
      setSelectedSources(new Set(available));
    }
  }, [open, file?.id]);

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

  const handleAsk = async () => {
    if (!askQuestion.trim() || asking) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAsking(true);
    setAskAnswer('');
    try {
      const res = await fetch('/api/draft/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: askQuestion,
          draft: askContext?.draft,
          transcript: askContext?.transcript,
          notes: askContext?.notes,
          type: askContext?.type,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Failed');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setAskAnswer(full);
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setAskAnswer('Something went wrong. Try again.');
    } finally {
      setAsking(false);
    }
  };

  const stopLabels = ['My words', 'I lead', 'Co-author', 'AI drafts'];
  const placeholders = [
    'Just fact-check what I wrote.',
    'What should I focus on? e.g. "Open with a question."',
    'Any direction? e.g. "Keep the carob-tree image."',
    'Optional — anything to emphasize?',
  ];
  const buttonLabel = voiceStop === 1 ? 'Check facts' : voiceStop === 4 ? 'Generate draft' : 'Help me write';

  const hasAnySources = sources.some(s => s.available);
  const hasSelectedSources = [...selectedSources].some(k => sources.find(s => s.key === k)?.available);

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
            <div className="fd-helper-tabs">
              <button
                type="button"
                className={`fd-helper-tab${tab === 'generate' ? ' active' : ''}`}
                onClick={() => setTab('generate')}>
                Generate
              </button>
              <button
                type="button"
                className={`fd-helper-tab${tab === 'ask' ? ' active' : ''}`}
                onClick={() => setTab('ask')}>
                Ask
              </button>
            </div>
            <button type="button" className="fd-helper-panel-close" onClick={() => setOpen(false)}>×</button>
          </div>

          {tab === 'generate' && (
            <>
              {/* Source chips */}
              <div className="fd-helper-section-label">Sources to draw from</div>
              <div className="fd-helper-sources">
                {sources.map(s => (
                  <button
                    key={s.key}
                    type="button"
                    className={`fd-helper-source-chip${selectedSources.has(s.key) ? ' active' : ''}${!s.available ? ' unavailable' : ''}`}
                    onClick={() => s.available && toggleSource(s.key)}
                    disabled={!s.available}
                    title={!s.available ? `No ${s.label.toLowerCase()} available` : undefined}
                  >
                    <span className="fd-helper-source-check">
                      {selectedSources.has(s.key) && s.available ? '✓' : ''}
                    </span>
                    <span>{s.label}</span>
                    {s.detail && s.available && (
                      <span className="fd-helper-source-detail">{s.detail}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Voice slider */}
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

              {/* Direction / instructions */}
              <div className="fd-helper-section-label">Direction</div>
              <textarea
                className="fd-helper-direction"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={placeholders[voiceStop - 1]}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onGenerate([...selectedSources]);
                }}
              />

              <div className="fd-helper-actions">
                <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn primary small"
                  onClick={() => onGenerate([...selectedSources])}
                  disabled={generating || (!hasSelectedSources && voiceStop !== 1)}>
                  {generating ? 'Working…' : buttonLabel}
                </button>
              </div>
            </>
          )}

          {tab === 'ask' && (
            <>
              <textarea
                className="fd-helper-ask-input"
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                placeholder="Ask anything — structure, sources, tone, direction..."
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAsk();
                }}
              />
              <div className="fd-helper-actions">
                <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn primary small"
                  onClick={handleAsk}
                  disabled={asking || !askQuestion.trim()}>
                  {asking ? 'Thinking…' : 'Ask'}
                </button>
              </div>

              {(asking || askAnswer) && (
                <div className="fd-helper-answer">
                  {askAnswer.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                  {asking && !askAnswer && (
                    <span className="fd-helper-answer-loading">Thinking…</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
