'use client';
// Source search modal — keyword, AI-enhanced, or deep search.
// Includes AI synthesis to compile a comprehensive answer from sources.

import { useEffect, useRef, useState, useCallback } from 'react';
import { I } from '../Icons';
import { api } from '@/app/_lib/api';
import { MarkdownBody } from '../MarkdownBody';
import type { LibraryResult } from '@/app/_lib/types';
import { useEncounters } from '@/app/_lib/encounters-store';

export function SourceModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LibraryResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<string>('all');
  const [searchMode, setSearchMode] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<string[] | null>(null);
  const [deep, setDeep] = useState(false);
  const { encounters, patch } = useEncounters();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const didAutoSearch = useRef(false);

  // Synthesis state
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthesis, setSynthesis] = useState('');
  const [showSynthesis, setShowSynthesis] = useState(false);
  const synthAbortRef = useRef<AbortController | null>(null);

  const doSearch = useCallback(async (q: string, cat?: string, isDeep?: boolean) => {
    if (!q.trim()) return;
    setSearching(true);
    setResults([]);
    setSearchMode(null);
    setSearchTerms(null);
    setSynthesis('');
    setShowSynthesis(false);
    try {
      const data = await api.sources.search(
        q,
        cat === 'all' ? undefined : cat,
        'auto',
        isDeep ? 'deep' : 'normal',
      );
      if (data.results) setResults(data.results);
      if (data.meta) {
        setSearchMode(data.meta.mode);
        setSearchTerms(data.meta.searches || null);
      }
    } catch (err) {
      console.error('[SourceModal] search failed:', err);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    doSearch(query, tab, deep);
  };

  // Pre-fill from selection
  useEffect(() => {
    if (didAutoSearch.current) return;
    const stashed = sessionStorage.getItem('drashai.selection-query');
    if (stashed?.trim()) {
      sessionStorage.removeItem('drashai.selection-query');
      setQuery(stashed.trim());
      didAutoSearch.current = true;
      setTimeout(() => doSearch(stashed.trim()), 0);
    }
  }, [doSearch]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  useEffect(() => {
    if (textareaRef.current && query) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [query]);

  const handleSynthesize = async () => {
    if (!query.trim() || results.length === 0) return;
    synthAbortRef.current?.abort();
    const controller = new AbortController();
    synthAbortRef.current = controller;
    setSynthesizing(true);
    setSynthesis('');
    setShowSynthesis(true);
    try {
      const res = await api.sources.synthesize(
        query,
        results.map((r) => ({ ref: r.ref, he: r.he, en: r.en })),
      );
      if (!res.ok) throw new Error('Synthesis failed');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setSynthesis(full);
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setSynthesis('Synthesis failed. Try again.');
    } finally {
      setSynthesizing(false);
    }
  };

  const isDeepMode = searchMode === 'deep';
  const isSmartSearch = searchMode === 'smart' || isDeepMode;

  return (
    <div className="modal-shroud" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-eyebrow">Search sources</div>
        <h2 className="modal-title">חיפוש מקורות</h2>
        <div className="modal-title-en">Keyword, question, or paste a passage</div>

        <form className="search-row" onSubmit={handleSearch} style={{ marginTop: 16 }}>
          <textarea
            ref={textareaRef}
            className="search-input source-search-textarea"
            value={query}
            onChange={handleInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSearch(); }
            }}
            placeholder="Paste text, ask a question, or search by keyword..."
            rows={2}
            autoFocus
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignSelf: 'flex-end' }}>
            <button type="submit" className="btn primary" disabled={searching}>
              <span className="icon">{I.search}</span>
            </button>
            <button
              type="button"
              className={`source-deep-toggle${deep ? ' active' : ''}`}
              onClick={() => setDeep((v) => !v)}
              title="Deep search — thorough multi-source dive">
              Deep
            </button>
          </div>
        </form>

        <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto', alignItems: 'center' }}>
          {['all', 'tanakh', 'talmud', 'midrash', 'commentary'].map((cat) => (
            <button
              key={cat}
              className={`tab ${tab === cat ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setTab(cat)}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
          {isDeepMode && <span className="source-smart-badge">Deep search</span>}
          {isSmartSearch && !isDeepMode && <span className="source-smart-badge">AI-enhanced</span>}
        </div>

        {searchTerms && searchTerms.length > 0 && (
          <div className="source-search-terms">
            {searchTerms.map((t, i) => (
              <span key={i} className="source-search-term">{t}</span>
            ))}
          </div>
        )}

        {/* Synthesis panel */}
        {showSynthesis && (
          <div className="source-synthesis">
            <div className="source-synthesis-head">
              <span className="source-synthesis-label">AI Synthesis</span>
              {!synthesizing && synthesis && (
                <button
                  className="btn ghost small"
                  onClick={async () => {
                    await navigator.clipboard.writeText(synthesis);
                  }}>
                  Copy
                </button>
              )}
              <button className="btn ghost small" onClick={() => { setShowSynthesis(false); synthAbortRef.current?.abort(); }}>
                ×
              </button>
            </div>
            <div className="source-synthesis-body">
              {synthesis ? (
                <MarkdownBody text={synthesis} />
              ) : (
                <span className="source-synthesis-loading">Synthesizing from {results.length} sources…</span>
              )}
            </div>
          </div>
        )}

        {/* Results header with synthesize button */}
        {results.length > 0 && !searching && (
          <div className="source-results-head">
            <span className="source-results-count">{results.length} sources found</span>
            {!showSynthesis && (
              <button className="source-synthesize-btn" onClick={handleSynthesize} disabled={synthesizing}>
                Synthesize answer
              </button>
            )}
          </div>
        )}

        <div style={{ maxHeight: showSynthesis ? 280 : 420, overflow: 'auto' }}>
          {searching && (
            <div className="mono" style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }}>
              {deep ? 'Deep searching…' : query.split(/\s+/).length > 3 ? 'Searching with AI…' : 'Searching...'}
            </div>
          )}
          {!searching && results.length === 0 && query && (
            <div className="empty-state" style={{ padding: 24 }}>No results.</div>
          )}
          {results.map((s, i) => (
            <div key={i} className="source-card" style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <div className="source-cite">{s.ref}</div>
                {s.matchType && s.matchType !== 'keyword' && (
                  <span className="source-match-type">{s.matchType}</span>
                )}
              </div>
              {s.he && <div className="source-heb">{s.he}</div>}
              {s.en && <div className="source-en">{s.en}</div>}
              {s.relevance && (
                <div className="source-relevance">{s.relevance}</div>
              )}
              {encounters.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <select
                    className="input"
                    style={{ width: 'auto', padding: '4px 8px', fontSize: 11 }}
                    defaultValue=""
                    onChange={async (e) => {
                      const fileId = e.target.value;
                      if (!fileId) return;
                      await patch(fileId, {
                        addSource: { ref: s.ref, he: s.he, en: s.en, addedAt: new Date().toISOString() },
                      });
                      e.target.value = '';
                    }}>
                    <option value="" disabled>Attach to file...</option>
                    {encounters.map((enc) => (
                      <option key={enc.id} value={enc.id}>{enc.congregantName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
