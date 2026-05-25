'use client';
// Source search modal — Sefaria + personal library. Opens from Draft tab toolbar
// or from anywhere via useModal().open('sources').

import { useState } from 'react';
import { I } from '../Icons';
import { api } from '@/app/_lib/api';
import type { LibraryResult } from '@/app/_lib/types';
import { useEncounters } from '@/app/_lib/encounters-store';

export function SourceModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LibraryResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<string>('all');
  const { encounters, patch } = useEncounters();

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const data = await api.sources.search(query, tab === 'all' ? undefined : tab);
      if (data.results) setResults(data.results);
    } catch (err) {
      console.error('[SourceModal] search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="modal-shroud" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="modal-eyebrow">Search sources</div>
        <h2 className="modal-title">חיפוש מקורות</h2>
        <div className="modal-title-en">Search Tanakh, Talmud, Midrash...</div>

        <form className="search-row" onSubmit={handleSearch} style={{ marginTop: 16 }}>
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Topic, keyword, or reference (Genesis 1:1)"
            autoFocus
          />
          <button type="submit" className="btn primary" disabled={searching}>
            <span className="icon">{I.search}</span>
          </button>
        </form>

        <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto' }}>
          {['all', 'tanakh', 'talmud', 'midrash', 'commentary'].map((cat) => (
            <button
              key={cat}
              className={`tab ${tab === cat ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setTab(cat)}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ maxHeight: 420, overflow: 'auto' }}>
          {searching && <div className="mono" style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }}>Searching...</div>}
          {!searching && results.length === 0 && query && (
            <div className="empty-state" style={{ padding: 24 }}>No results.</div>
          )}
          {results.map((s, i) => (
            <div key={i} className="source-card" style={{ marginBottom: 8 }}>
              <div className="source-cite">{s.ref}</div>
              {s.he && <div className="source-heb">{s.he}</div>}
              {s.en && <div className="source-en">{s.en}</div>}
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
