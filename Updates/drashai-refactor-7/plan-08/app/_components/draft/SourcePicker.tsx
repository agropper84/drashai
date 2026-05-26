'use client';
// A slim inline picker that opens via ⌘K or /source. Searches the file's
// already-attached sources first (fast), then falls through to a Sefaria
// search if nothing matches.

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/app/_lib/api';
import type { EncounterSource, LibraryResult } from '@/app/_lib/types';

export interface SourcePickerProps {
  /** Sources already attached to this file — searched first, instantly. */
  attached: EncounterSource[];
  open: boolean;
  /** When open, anchor coordinates (x, y) for positioning. */
  anchor?: { x: number; y: number };
  onClose: () => void;
  onPick: (source: Pick<EncounterSource, 'ref' | 'he' | 'en'>) => void;
}

interface Hit {
  ref: string;
  he: string;
  en: string;
  source: 'attached' | 'sefaria';
}

export function SourcePicker({ attached, open, anchor, onClose, onPick }: SourcePickerProps) {
  const [query, setQuery] = useState('');
  const [remoteHits, setRemoteHits] = useState<LibraryResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter attached sources locally — instant.
  const attachedHits: Hit[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return attached.map((s) => ({ ref: s.ref, he: s.he, en: s.en, source: 'attached' as const }));
    return attached
      .filter((s) =>
        s.ref.toLowerCase().includes(q) ||
        s.he.toLowerCase().includes(q) ||
        s.en.toLowerCase().includes(q))
      .map((s) => ({ ref: s.ref, he: s.he, en: s.en, source: 'attached' as const }));
  }, [attached, query]);

  // Debounced remote search.
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = query.trim();
    if (q.length < 3) { setRemoteHits([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.sources.search(q);
        setRemoteHits(data.results || []);
      } catch {
        setRemoteHits([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  const remoteAsHits: Hit[] = remoteHits.map((r) => ({
    ref: r.ref, he: r.he, en: r.en, source: 'sefaria' as const,
  }));
  const allHits: Hit[] = [...attachedHits, ...remoteAsHits];

  useEffect(() => { setActiveIdx(0); }, [allHits.length]);
  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, allHits.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = allHits[activeIdx];
      if (hit) onPick({ ref: hit.ref, he: hit.he, en: hit.en });
    }
  };

  const positioned = anchor
    ? { position: 'fixed' as const, left: anchor.x, top: anchor.y, width: 420 }
    : { position: 'fixed' as const, left: '50%', top: '20%', transform: 'translateX(-50%)', width: 480 };

  return (
    <>
      <div className="source-picker-shroud" onClick={onClose} />
      <div className="source-picker" style={positioned} onClick={(e) => e.stopPropagation()}>
        <div className="source-picker-header">
          <input
            ref={inputRef}
            className="source-picker-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search sources — verse, theme, or phrase…"
          />
          <span className="source-picker-kbd">esc</span>
        </div>

        <div className="source-picker-results">
          {allHits.length === 0 && !searching && query.length < 3 && (
            <div className="source-picker-empty">
              {attached.length === 0
                ? 'Type 3+ characters to search Tanakh, Talmud, Midrash...'
                : 'No matches in attached sources. Keep typing to search more.'}
            </div>
          )}
          {allHits.length === 0 && !searching && query.length >= 3 && (
            <div className="source-picker-empty">No results.</div>
          )}
          {searching && allHits.length === 0 && (
            <div className="source-picker-empty">Searching…</div>
          )}

          {allHits.map((hit, i) => (
            <button
              key={`${hit.source}-${hit.ref}-${i}`}
              type="button"
              className={`source-picker-hit${i === activeIdx ? ' active' : ''}`}
              onMouseEnter={() => setActiveIdx(i)}
              onClick={() => onPick({ ref: hit.ref, he: hit.he, en: hit.en })}>
              <span className="source-picker-hit-tag">{hit.source === 'attached' ? 'Attached' : 'Sefaria'}</span>
              <span className="source-picker-hit-ref">{hit.ref}</span>
              {hit.en && (
                <span className="source-picker-hit-en">
                  {hit.en.substring(0, 100)}{hit.en.length > 100 ? '…' : ''}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="source-picker-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> insert</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </>
  );
}
