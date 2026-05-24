'use client';
// Library — Sefaria search + personal sources + folders + suggested searches.
// Preserves your recent additions: folders, URL/upload to library, deletable
// suggested-search chips, "show all" toggle, per-source folder picker, per-source
// copy-to-sparks, per-source copy-to-file.

import { I } from '@/app/_components/Icons';
import { useLibrary } from '@/app/_lib/library-store';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useSparks } from '@/app/_lib/sparks-store';
import { api } from '@/app/_lib/api';
import type { LibraryResult, SavedSource } from '@/app/_lib/types';

export default function LibraryPage() {
  const {
    query, setQuery,
    results, setResults,
    searching, setSearching,
    error, setError,
    saved, setSaved,
    folders, setFolders,
    activeFolder, setActiveFolder,
    text, setText,
    loadingText, setLoadingText,
    browse, setBrowse,
    suggested, setSuggested,
    showAllSuggested, setShowAllSuggested,
  } = useLibrary();
  const { encounters, refresh } = useEncounters();
  const { setSparks } = useSparks();

  const searchLibrary = async (q: string, cat?: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setError('');
    setResults([]);
    try {
      // Personal search uses saved sources, client-side filter
      if (cat === 'personal') {
        const qLower = q.toLowerCase();
        const matched: LibraryResult[] = saved
          .filter((s) =>
            s.ref.toLowerCase().includes(qLower) ||
            s.he.toLowerCase().includes(qLower) ||
            s.en.toLowerCase().includes(qLower)
          )
          .map((s) => ({ ref: s.ref, heRef: '', he: s.he, en: s.en, categories: [s.type || 'personal'] }));
        if (matched.length > 0) setResults(matched);
        else setError(`No personal sources match "${q}"`);
        return;
      }
      const data = await api.sources.search(q, cat);
      if (data.results && data.results.length > 0) setResults(data.results);
      else setError(data.error || `No results found for "${q}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      setError(msg);
    } finally {
      setSearching(false);
    }
  };

  const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await api.uploadDocument(file, 'library');
      let excerpt = '';
      if (file.name.endsWith('.txt')) {
        excerpt = await file.text().then((t) => t.substring(0, 300));
      }
      const newSaved: SavedSource = {
        ref: file.name,
        he: '',
        en: excerpt || `Uploaded (${(file.size / 1024).toFixed(1)}KB)`,
        savedAt: new Date().toISOString(),
        url: data.url,
        type: 'upload',
        folder: 'General',
      };
      setSaved((prev) => [newSaved, ...prev]);
    } catch (err) {
      console.error('[Library] upload failed:', err);
    }
    e.target.value = '';
  };

  const handleAddUrl = () => {
    const url = prompt('Paste a URL:');
    if (url?.trim()) {
      const newSaved: SavedSource = {
        ref: url.trim().substring(0, 60),
        he: '',
        en: url.trim(),
        savedAt: new Date().toISOString(),
        url: url.trim(),
        type: 'url',
        folder: 'General',
      };
      setSaved((prev) => [newSaved, ...prev]);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-title-wrap">
          <div className="page-eyebrow">Texts & references</div>
          <h1 className="page-title heb-display">ספרייה</h1>
          <div className="page-title-en">Library</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <label className="btn small" style={{ cursor: 'pointer' }}>
            <span className="icon">{I.doc}</span> Upload
            <input
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              style={{ display: 'none' }}
              onChange={handleUploadDocument}
            />
          </label>
          <button className="btn small" onClick={handleAddUrl}>
            <span className="icon">{I.search}</span> URL
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <form
          className="search-row"
          style={{ flex: 1, marginBottom: 0 }}
          onSubmit={(e) => {
            e.preventDefault();
            searchLibrary(query, browse || undefined);
          }}>
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search — topic (love, mourning), keyword (hesed), or reference (Genesis 1:1)..."
          />
          <button type="submit" className="btn primary" disabled={searching}>
            <span className="icon">{I.search}</span>
          </button>
        </form>
        {query && (
          <button
            className="btn ghost small"
            onClick={() => {
              setQuery('');
              setResults([]);
              setError('');
            }}>
            <span className="icon" style={{ width: 14, height: 14 }}>{I.x}</span> Clear
          </button>
        )}
      </div>

      {/* Category filters */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto' }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'tanakh', label: 'Tanakh' },
          { key: 'talmud', label: 'Talmud' },
          { key: 'midrash', label: 'Midrash' },
          { key: 'commentary', label: 'Commentary' },
          { key: 'personal', label: `My Sources (${saved.length})` },
        ].map((cat) => (
          <button
            key={cat.key}
            className={`tab ${(browse || 'all') === cat.key ? 'active' : ''}`}
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => {
              setBrowse(cat.key === 'all' ? null : cat.key);
              if (query) searchLibrary(query, cat.key === 'all' ? undefined : cat.key);
            }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Suggested searches */}
      {!query && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center',
        }}>
          {suggested.slice(0, showAllSuggested ? 10 : 5).map((s, i) => (
            <div key={s.q} style={{ display: 'inline-flex', alignItems: 'center', gap: 0 }}>
              <button
                className="btn small"
                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                onClick={() => {
                  setQuery(s.q);
                  searchLibrary(s.q);
                }}>
                {s.label}
              </button>
              <button
                className="btn ghost small"
                style={{
                  borderTopLeftRadius: 0, borderBottomLeftRadius: 0,
                  padding: '6px 4px', minWidth: 24, color: 'var(--ink-4)',
                }}
                onClick={() => setSuggested((prev) => prev.filter((_, j) => j !== i))}
                title="Remove">
                <span className="icon" style={{ width: 10, height: 10 }}>{I.x}</span>
              </button>
            </div>
          ))}
          {suggested.length > 5 && (
            <button
              className="btn ghost small"
              onClick={() => setShowAllSuggested(!showAllSuggested)}>
              {showAllSuggested ? 'Less' : `+${suggested.length - 5} more`}
            </button>
          )}
        </div>
      )}

      {/* Text viewer */}
      {text && (
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div className="mono" style={{ color: 'var(--gold)', marginBottom: 4 }}>{text.ref}</div>
              {text.heRef && (
                <div className="heb" style={{ fontSize: 14, color: 'var(--ink-3)' }}>{text.heRef}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <select
                className="input"
                style={{ width: 'auto', padding: '4px 8px', fontSize: 11 }}
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    setSaved((prev) => [{
                      ref: text.ref,
                      he: text.he,
                      en: text.en,
                      savedAt: new Date().toISOString(),
                      folder: e.target.value,
                    }, ...prev]);
                    e.target.value = '';
                  }
                }}>
                <option value="" disabled>Save to...</option>
                {folders.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <button className="btn ghost small" onClick={() => setText(null)}>
                <span className="icon" style={{ width: 14, height: 14 }}>{I.x}</span>
              </button>
            </div>
          </div>
          {text.he && <div className="source-heb" style={{ marginBottom: 12 }}>{text.he}</div>}
          {text.en && <div className="source-en">{text.en}</div>}
        </div>
      )}
      {loadingText && (
        <div className="mono" style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }}>
          Loading text...
        </div>
      )}

      {/* Search results */}
      {searching && (
        <div className="mono" style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }}>
          Searching...
        </div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: 16, color: 'var(--ink-3)', fontSize: 13, fontStyle: 'italic' }}>
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div className="nav-section" style={{ marginBottom: 10 }}>
            {results.length} Results {query && `for "${query}"`}
          </div>
          <div className="source-list">
            {results.map((s, i) => (
              <div
                key={i}
                className="source-card"
                onClick={() => setText(s)}
                style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="source-cite">{s.ref}</div>
                  {s.categories?.length > 0 && (
                    <span className="badge" style={{ fontSize: 8, padding: '2px 6px' }}>{s.categories[0]}</span>
                  )}
                </div>
                {s.he && (
                  <div className="source-heb" style={{ fontSize: 18 }}>
                    {s.he.substring(0, 250)}{s.he.length > 250 ? '...' : ''}
                  </div>
                )}
                {s.en && (
                  <div className="source-en" style={{ fontSize: 14 }}>
                    {s.en.substring(0, 250)}{s.en.length > 250 ? '...' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved sources — folders */}
      {saved.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="nav-section" style={{ margin: 0 }}>My Sources ({saved.length})</div>
            <button
              className="btn ghost small"
              onClick={() => {
                const name = prompt('New folder name:');
                if (name?.trim() && !folders.includes(name.trim())) {
                  setFolders((prev) => [...prev, name.trim()]);
                }
              }}>
              <span className="icon" style={{ width: 12, height: 12 }}>{I.plus}</span> Folder
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto' }}>
            <button
              className={`tab ${!activeFolder ? 'active' : ''}`}
              style={{ padding: '6px 10px', fontSize: 11 }}
              onClick={() => setActiveFolder(null)}>
              All
            </button>
            {folders.map((f) => (
              <button
                key={f}
                className={`tab ${activeFolder === f ? 'active' : ''}`}
                style={{ padding: '6px 10px', fontSize: 11 }}
                onClick={() => setActiveFolder(f)}>
                {f} ({saved.filter((s) => (s.folder || 'General') === f).length})
              </button>
            ))}
          </div>

          <div className="source-list">
            {saved
              .filter((s) => !activeFolder || (s.folder || 'General') === activeFolder)
              .map((s, i) => (
                <div
                  key={i}
                  className="source-card"
                  onClick={() => { if (s.url) window.open(s.url, '_blank'); }}
                  style={{
                    cursor: s.url ? 'pointer' : 'default',
                    borderLeftColor:
                      s.type === 'upload' ? 'var(--sage)' :
                      s.type === 'url' ? 'var(--accent)' : 'var(--gold)',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div className="source-cite">{s.ref}</div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                        {s.type && <span className="badge" style={{ fontSize: 8, padding: '1px 5px' }}>{s.type}</span>}
                        <span className="badge" style={{ fontSize: 8, padding: '1px 5px' }}>{s.folder || 'General'}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      <select
                        className="mono"
                        style={{
                          fontSize: 9, background: 'var(--bg-sunken)',
                          border: '1px solid var(--rule-soft)', borderRadius: 3,
                          padding: '2px 4px', color: 'var(--ink-3)', cursor: 'pointer',
                        }}
                        value={s.folder || 'General'}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSaved((prev) => prev.map((x, j) =>
                            j === saved.indexOf(s) ? { ...x, folder: e.target.value } : x
                          ));
                        }}>
                        {folders.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <button
                        className="btn ghost small"
                        style={{ minHeight: 24, minWidth: 24, padding: 2 }}
                        title="Copy to Sparks"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSparks((prev) => [{
                            id: crypto.randomUUID(),
                            body: `${s.ref}\n${s.he || s.en}`,
                            tag: 'Source',
                            when: new Date().toLocaleDateString(),
                            url: s.url,
                          }, ...prev]);
                        }}>
                        <span className="icon" style={{ width: 12, height: 12 }}>{I.spark}</span>
                      </button>
                      {encounters.length > 0 && (
                        <select
                          className="mono"
                          style={{
                            fontSize: 9, background: 'var(--bg-sunken)',
                            border: '1px solid var(--rule-soft)', borderRadius: 3,
                            padding: '2px', color: 'var(--ink-3)', cursor: 'pointer', maxWidth: 60,
                          }}
                          defaultValue=""
                          onChange={async (e) => {
                            e.stopPropagation();
                            if (e.target.value) {
                              await api.encounters.patch(e.target.value, {
                                addSource: {
                                  ref: s.ref, he: s.he, en: s.en,
                                  addedAt: new Date().toISOString(),
                                },
                              });
                              refresh();
                              e.target.value = '';
                            }
                          }}>
                          <option value="" disabled>→ File</option>
                          {encounters.map((enc) => (
                            <option key={enc.id} value={enc.id}>{enc.congregantName}</option>
                          ))}
                        </select>
                      )}
                      <button
                        className="btn ghost small"
                        style={{ minHeight: 24, minWidth: 24, padding: 2 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSaved((prev) => prev.filter((_, j) => j !== saved.indexOf(s)));
                        }}>
                        <span className="icon" style={{ width: 12, height: 12 }}>{I.trash}</span>
                      </button>
                    </div>
                  </div>
                  {s.he && (
                    <div className="source-heb" style={{ fontSize: 16 }}>
                      {s.he.substring(0, 150)}{s.he.length > 150 ? '...' : ''}
                    </div>
                  )}
                  {s.en && (
                    <div className="source-en" style={{ fontSize: 13 }}>
                      {s.en.substring(0, 150)}{s.en.length > 150 ? '...' : ''}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!searching && results.length === 0 && saved.length === 0 && !text && !query && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div className="card" style={{ padding: 22 }}>
            <div className="mono" style={{ color: 'var(--gold)', marginBottom: 8 }}>Sefaria</div>
            <p style={{ fontSize: 20, fontWeight: 600 }}>Jewish Texts</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>
              3,000+ years of Torah, Talmud, Midrash, Halakha, and commentaries
            </p>
          </div>
          <div className="card" style={{ padding: 22 }}>
            <div className="mono" style={{ color: 'var(--gold)', marginBottom: 8 }}>Personal</div>
            <p style={{ fontSize: 20, fontWeight: 600 }}>My Sources</p>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>
              Save, organize, and connect sources to your encounters
            </p>
          </div>
        </div>
      )}
    </>
  );
}
