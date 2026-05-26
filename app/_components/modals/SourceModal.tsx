'use client';
// Source search modal — supports keyword search AND AI-enhanced semantic search.
// Paste text, ask a question, or search by keyword.

import { useEffect, useRef, useState, useCallback } from 'react';
import { I } from '../Icons';
import { api } from '@/app/_lib/api';
import type { LibraryResult } from '@/app/_lib/types';
import { useEncounters } from '@/app/_lib/encounters-store';

export function SourceModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LibraryResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<string>('all');
  const [searchMode, setSearchMode] = useState<string | null>(null);
  const [searchTerms, setSearchTerms] = useState<string[] | null>(null);
  const { encounters, patch } = useEncounters();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const didAutoSearch = useRef(false);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    doSearch(query, tab);
  };

  // Pre-fill from selection (set by SelectionMenu → sessionStorage)
  useEffect(() => {
    if (didAutoSearch.current) return;
    const stashed = sessionStorage.getItem('drashai.selection-query');
    if (stashed?.trim()) {
      sessionStorage.removeItem('drashai.selection-query');
      setQuery(stashed.trim());
      didAutoSearch.current = true;
      // Auto-search after a tick so state is set
      setTimeout(() => {
        doSearch(stashed.trim());
      }, 0);
    }
  }, []);

  // Extracted search logic so it can be called from both form submit and auto-search
  const doSearch = useCallback(async (q: string, cat?: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setResults([]);
    setSearchMode(null);
    setSearchTerms(null);
    try {
      const data = await api.sources.search(q, cat === 'all' ? undefined : cat);
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

  // Auto-expand textarea on input and when pre-filled
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuery(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  // Resize textarea when query is set programmatically
  useEffect(() => {
    if (textareaRef.current && query) {
      const el = textareaRef.current;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 160) + 'px';
    }
  }, [query]);

  const isSmartSearch = searchMode === 'smart';
  const hasRelevance = results.some((r) => r.relevance);

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
          <button type="submit" className="btn primary" disabled={searching} style={{ alignSelf: 'flex-end' }}>
            <span className="icon">{I.search}</span>
          </button>
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
          {isSmartSearch && (
            <span className="source-smart-badge">AI-enhanced</span>
          )}
        </div>

        {/* Show decomposed search terms for transparency */}
        {searchTerms && searchTerms.length > 0 && (
          <div className="source-search-terms">
            {searchTerms.map((t, i) => (
              <span key={i} className="source-search-term">{t}</span>
            ))}
          </div>
        )}

        <div style={{ maxHeight: 420, overflow: 'auto' }}>
          {searching && (
            <div className="mono" style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }}>
              {query.split(/\s+/).length > 3 ? 'Searching with AI…' : 'Searching...'}
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
