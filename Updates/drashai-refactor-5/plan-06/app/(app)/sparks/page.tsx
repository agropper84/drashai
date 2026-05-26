'use client';
// Plan 6 — global Sparks inbox. Same data as per-file Insights tab.
// Adds an "Assign to file..." dropdown on each spark and a file-filter
// chip row at the top.

import { useMemo, useRef, useState } from 'react';
import { I } from '@/app/_components/Icons';
import { useSparks, SPARK_CATEGORIES } from '@/app/_lib/sparks-store';
import { useEncounters } from '@/app/_lib/encounters-store';
import { api } from '@/app/_lib/api';

type FileFilter = 'all' | 'unassigned' | string; // a file id

export default function SparksPage() {
  const { sparks, loading, create, patch, remove } = useSparks();
  const { encounters } = useEncounters();

  const [newSpark, setNewSpark] = useState('');
  const [sparkRecording, setSparkRecording] = useState(false);
  const [sparkTranscribing, setSparkTranscribing] = useState(false);
  const sparkRecorderRef = useRef<MediaRecorder | null>(null);
  const sparkChunksRef = useRef<Blob[]>([]);
  const [sparkSelected, setSparkSelected] = useState<Set<string>>(new Set());
  const [editingSpark, setEditingSpark] = useState<string | null>(null);
  const [editSparkText, setEditSparkText] = useState('');
  const [fileFilter, setFileFilter] = useState<FileFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const visibleSparks = useMemo(() => {
    let filtered = sparks;
    if (fileFilter === 'unassigned') {
      filtered = filtered.filter((s) => !s.fileId);
    } else if (fileFilter !== 'all') {
      filtered = filtered.filter((s) => s.fileId === fileFilter);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((s) => (s.category || 'Uncategorized') === categoryFilter);
    }
    return filtered;
  }, [sparks, fileFilter, categoryFilter]);

  const toggleSparkSelect = (id: string) => {
    setSparkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const assignSelectedTo = async (encId: string | null) => {
    for (const id of sparkSelected) {
      await patch(id, encId ? { fileId: encId } : { fileId: null });
    }
    setSparkSelected(new Set());
  };

  const handleVoiceNote = async () => {
    if (sparkRecording) {
      const recorder = sparkRecorderRef.current;
      if (!recorder) return;
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
      sparkRecorderRef.current = null;
      setSparkRecording(false);
      setSparkTranscribing(true);
      const blob = new Blob(sparkChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      sparkChunksRef.current = [];
      try {
        const data = await api.transcribe(blob, 'dictation');
        if (data.text) await create({ body: data.text, tag: 'Voice Note' });
      } catch (err) {
        console.error('[Sparks] transcribe failed:', err);
      } finally {
        setSparkTranscribing(false);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus' : 'audio/mp4';
        const recorder = new MediaRecorder(stream, { mimeType });
        sparkChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) sparkChunksRef.current.push(e.data);
        };
        recorder.start(1000);
        sparkRecorderRef.current = recorder;
        setSparkRecording(true);
      } catch {
        setNewSpark((prev) => prev + '\n[Microphone access denied]');
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await api.uploadDocument(file, 'sparks');
      await create({
        body: `${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
        tag: file.type.startsWith('image/') ? 'Screenshot' : 'Document',
        url: data.url,
      });
    } catch (err) {
      console.error('[Sparks] upload failed:', err);
    }
    e.target.value = '';
  };

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const form = new FormData();
          form.append('file', blob, `screenshot-${Date.now()}.png`);
          form.append('encounterId', 'sparks');
          const res = await fetch('/api/upload-document', { method: 'POST', body: form });
          if (res.ok) {
            const data = await res.json();
            await create({ body: 'Screenshot captured', tag: 'Screenshot', url: data.url });
          }
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      if (text) setNewSpark((prev) => (prev ? prev + '\n' + text : text));
    } catch {
      alert('Clipboard access denied. Try pasting with ⌘V instead.');
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-title-wrap">
          <div className="page-eyebrow">Capture before it fades</div>
          <h1 className="page-title heb-display">ניצוצות</h1>
          <div className="page-title-en">Sparks · {sparks.length} total</div>
        </div>
      </div>

      {/* Capture area */}
      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <textarea
          className="input serif"
          rows={3}
          value={newSpark}
          onChange={(e) => setNewSpark(e.target.value)}
          placeholder="A fleeting thought, a connection, an image that spoke to you..."
          style={{ marginBottom: 12 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && newSpark.trim()) {
              create({ body: newSpark, tag: 'Thought' });
              setNewSpark('');
            }
          }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn primary"
            disabled={!newSpark.trim()}
            onClick={async () => {
              if (!newSpark.trim()) return;
              await create({ body: newSpark, tag: 'Thought' });
              setNewSpark('');
            }}>
            <span className="icon">{I.plus}</span> Capture
          </button>
          <button
            className={`btn ${sparkRecording ? 'primary' : ''}`}
            disabled={sparkTranscribing}
            onClick={handleVoiceNote}>
            <span className="icon">{sparkRecording ? I.stop : I.mic}</span>
            {sparkTranscribing ? 'Transcribing...' : sparkRecording ? 'Stop & Save' : 'Voice Note'}
          </button>
          <button
            className="btn"
            onClick={async () => {
              const url = prompt('Paste a URL (article, teaching, video):');
              if (url?.trim()) await create({ body: url.trim(), tag: 'Link', url: url.trim() });
            }}>
            <span className="icon" style={{ width: 16, height: 16 }}>{I.search}</span> URL
          </button>
          <label className="btn" style={{ cursor: 'pointer' }}>
            <span className="icon">{I.doc}</span> Upload
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.txt"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </label>
          <button className="btn" onClick={handlePaste}>
            <span className="icon">{I.copy}</span> Paste
          </button>
        </div>
      </div>

      {/* Selection bulk-action */}
      {sparkSelected.size > 0 && (
        <div className="card" style={{
          padding: '12px 18px', marginBottom: 16, display: 'flex',
          alignItems: 'center', gap: 10, flexWrap: 'wrap',
          background: 'var(--accent-soft)', borderColor: 'var(--accent)',
        }}>
          <span className="mono" style={{ color: 'var(--accent)' }}>{sparkSelected.size} selected</span>
          <div style={{ flex: 1 }} />
          <select
            className="input"
            style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                assignSelectedTo(e.target.value === '__inbox__' ? null : e.target.value);
                e.target.value = '';
              }
            }}>
            <option value="" disabled>Assign to...</option>
            <option value="__inbox__">↑ Move to inbox</option>
            {encounters.filter((e) => !e.archivedAt).map((enc) => (
              <option key={enc.id} value={enc.id}>{enc.subject || enc.congregantName}</option>
            ))}
          </select>
          <button
            className="btn small"
            style={{ color: 'var(--accent)' }}
            onClick={() => {
              for (const id of sparkSelected) remove(id);
              setSparkSelected(new Set());
            }}>
            <span className="icon" style={{ width: 14, height: 14 }}>{I.trash}</span> Delete
          </button>
          <button className="btn ghost small" onClick={() => setSparkSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* File filter chips */}
      {sparks.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 10, overflowX: 'auto' }}>
          <button
            className={`tab ${fileFilter === 'all' ? 'active' : ''}`}
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setFileFilter('all')}>
            All
            <span className="count">{sparks.length}</span>
          </button>
          <button
            className={`tab ${fileFilter === 'unassigned' ? 'active' : ''}`}
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setFileFilter('unassigned')}>
            Inbox
            <span className="count">{sparks.filter((s) => !s.fileId).length}</span>
          </button>
          {encounters.filter((e) => !e.archivedAt).map((enc) => {
            const count = sparks.filter((s) => s.fileId === enc.id).length;
            if (count === 0) return null;
            return (
              <button
                key={enc.id}
                className={`tab ${fileFilter === enc.id ? 'active' : ''}`}
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => setFileFilter(enc.id)}>
                {enc.subject || enc.congregantName}
                <span className="count">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Category filter chips */}
      {sparks.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto' }}>
          {['all', ...SPARK_CATEGORIES].map((cat) => (
            <button
              key={cat}
              className={`tab ${categoryFilter === cat ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 11, opacity: 0.8 }}
              onClick={() => setCategoryFilter(cat)}>
              {cat === 'all' ? 'All categories' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Sparks grid */}
      {loading ? (
        <div className="mono" style={{ color: 'var(--ink-3)', padding: 40, textAlign: 'center' }}>
          Loading...
        </div>
      ) : visibleSparks.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: 18 }}>
            {fileFilter === 'all' && sparks.length === 0
              ? 'Your sparks inbox is empty'
              : 'No sparks match this filter'}
          </p>
          {fileFilter === 'all' && sparks.length === 0 && (
            <>
              <p style={{ fontSize: 14, marginTop: 8 }}>Capture ideas, fragments, and connections before they fade</p>
              <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 16 }}>
                Type a thought · Record a voice note · Save a URL · Upload a file · Paste a screenshot
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="insight-grid">
          {visibleSparks.map((s) => {
            const assignedFile = s.fileId ? encounters.find((e) => e.id === s.fileId) : null;
            return (
              <div
                key={s.id}
                className={`insight-card card ${sparkSelected.has(s.id) ? 'pin' : ''}`}
                style={{
                  cursor: 'default',
                  border: sparkSelected.has(s.id) ? '2px solid var(--accent)' : undefined,
                }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={sparkSelected.has(s.id)}
                    onChange={() => toggleSparkSelect(s.id)}
                    style={{ marginTop: 2, accentColor: 'var(--accent)' }}
                  />
                  <div className="insight-tag" style={{ flex: 1 }}>{s.tag || 'Thought'}</div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      className="btn ghost small"
                      style={{ minHeight: 24, minWidth: 24, padding: 2 }}
                      onClick={() => { setEditingSpark(s.id); setEditSparkText(s.body); }}
                      title="Edit">
                      ✎
                    </button>
                    <button
                      className="btn ghost small"
                      style={{ minHeight: 24, minWidth: 24, padding: 2 }}
                      onClick={() => remove(s.id)}
                      title="Delete">
                      <span className="icon" style={{ width: 12, height: 12 }}>{I.trash}</span>
                    </button>
                  </div>
                </div>

                {editingSpark === s.id ? (
                  <div>
                    <textarea
                      className="input serif"
                      rows={3}
                      value={editSparkText}
                      onChange={(e) => setEditSparkText(e.target.value)}
                      autoFocus
                      style={{ marginBottom: 8, fontSize: 15 }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          patch(s.id, { body: editSparkText });
                          setEditingSpark(null);
                        }
                        if (e.key === 'Escape') setEditingSpark(null);
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn small primary"
                        onClick={() => {
                          patch(s.id, { body: editSparkText });
                          setEditingSpark(null);
                        }}>
                        Save
                      </button>
                      <button className="btn ghost small" onClick={() => setEditingSpark(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="insight-body"
                    onClick={() => { if (s.url) window.open(s.url, '_blank'); }}
                    style={{ cursor: s.url ? 'pointer' : 'default' }}>
                    {s.body}
                  </div>
                )}

                {s.url && (
                  <div className="mono" style={{ fontSize: 9, color: 'var(--accent)', wordBreak: 'break-all' }}>
                    {s.url.substring(0, 60)}{s.url.length > 60 ? '...' : ''}
                  </div>
                )}

                {/* Assign-to bar */}
                <div style={{
                  display: 'flex', gap: 4, alignItems: 'center',
                  padding: '6px 0', borderTop: '1px dashed var(--rule-soft)',
                  marginTop: 8,
                }}>
                  <select
                    className="mono"
                    value={s.fileId || ''}
                    onChange={(e) => patch(s.id, { fileId: e.target.value || null })}
                    style={{
                      flex: 1, fontSize: 10, background: 'var(--bg-sunken)',
                      border: '1px solid var(--rule-soft)', borderRadius: 3,
                      padding: '3px 6px', color: assignedFile ? 'var(--accent)' : 'var(--ink-3)',
                      cursor: 'pointer',
                    }}>
                    <option value="">↑ Inbox (unassigned)</option>
                    {encounters.filter((e) => !e.archivedAt).map((enc) => (
                      <option key={enc.id} value={enc.id}>→ {enc.subject || enc.congregantName}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <select
                    className="mono"
                    value={s.category || 'Uncategorized'}
                    onChange={(e) => patch(s.id, { category: e.target.value })}
                    style={{
                      fontSize: 9, background: 'var(--bg-sunken)', border: '1px solid var(--rule-soft)',
                      borderRadius: 3, padding: '2px 4px', color: 'var(--ink-3)', cursor: 'pointer',
                    }}>
                    {SPARK_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <div className="insight-foot">{s.when}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
