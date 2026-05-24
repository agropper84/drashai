'use client';
// Sparks page — global capture inbox + voice notes + URL/file uploads + screenshot paste.
// State moved out of App into useSparks(); recorder isolated via local refs to avoid
// fighting with the encounter recorder.

import { useRef, useState } from 'react';
import { I } from '@/app/_components/Icons';
import { useSparks, SPARK_CATEGORIES } from '@/app/_lib/sparks-store';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useModal } from '@/app/_components/modals/ModalProvider';
import { api } from '@/app/_lib/api';
import type { Spark } from '@/app/_lib/types';

export default function SparksPage() {
  const { sparks, setSparks } = useSparks();
  const { encounters, refresh } = useEncounters();
  const { open } = useModal();

  const [newSpark, setNewSpark] = useState('');
  const [sparkRecording, setSparkRecording] = useState(false);
  const [sparkTranscribing, setSparkTranscribing] = useState(false);
  const sparkRecorderRef = useRef<MediaRecorder | null>(null);
  const sparkChunksRef = useRef<Blob[]>([]);
  const [sparkSelected, setSparkSelected] = useState<Set<string>>(new Set());
  const [editingSpark, setEditingSpark] = useState<string | null>(null);
  const [editSparkText, setEditSparkText] = useState('');
  const [sparkFilter, setSparkFilter] = useState('all');
  const [sparkSearching, setSparkSearching] = useState<string | null>(null);

  const toggleSparkSelect = (id: string) => {
    setSparkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mergeSparks = () => {
    if (sparkSelected.size < 2) return;
    const selected = sparks.filter((s) => sparkSelected.has(s.id));
    const merged: Spark = {
      id: crypto.randomUUID(),
      body: selected.map((s) => s.body).join('\n\n---\n\n'),
      tag: 'Merged',
      when: new Date().toLocaleDateString(),
      category: selected[0].category,
      url: selected.find((s) => s.url)?.url,
    };
    setSparks((prev) => [merged, ...prev.filter((s) => !sparkSelected.has(s.id))]);
    setSparkSelected(new Set());
  };

  const mergeSparkToFile = async (encId: string) => {
    const selected = sparks.filter((s) => sparkSelected.has(s.id));
    if (selected.length === 0) return;
    const text = selected.map((s) => `[Spark: ${s.tag}] ${s.body}`).join('\n\n');
    await api.encounters.patch(encId, { appendTranscript: '\n\n' + text });
    setSparks((prev) => prev.filter((s) => !sparkSelected.has(s.id)));
    setSparkSelected(new Set());
    refresh();
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
        if (data.text) {
          setSparks((prev) => [{
            id: crypto.randomUUID(),
            body: data.text,
            tag: 'Voice Note',
            when: new Date().toLocaleDateString(),
          }, ...prev]);
        }
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
      setSparks((prev) => [{
        id: crypto.randomUUID(),
        body: `${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
        tag: file.type.startsWith('image/') ? 'Screenshot' : 'Document',
        when: new Date().toLocaleDateString(),
        url: data.url,
      }, ...prev]);
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
            setSparks((prev) => [{
              id: crypto.randomUUID(),
              body: 'Screenshot captured',
              tag: 'Screenshot',
              when: new Date().toLocaleDateString(),
              url: data.url,
            }, ...prev]);
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

  const findSourcesFor = async (spark: Spark) => {
    setSparkSearching(spark.id);
    try {
      const keywords = spark.body.split(/\s+/).filter((w) => w.length > 3).slice(0, 3).join(' ');
      open('sources');
      // SourceModal will host its own search; the user types or we could pre-fill in a future iteration
    } finally {
      setSparkSearching(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-title-wrap">
          <div className="page-eyebrow">Capture before it fades</div>
          <h1 className="page-title heb-display">ניצוצות</h1>
          <div className="page-title-en">Sparks</div>
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
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn primary"
            disabled={!newSpark.trim()}
            onClick={() => {
              if (!newSpark.trim()) return;
              setSparks((prev) => [{
                id: crypto.randomUUID(),
                body: newSpark,
                tag: 'Thought',
                when: new Date().toLocaleDateString(),
              }, ...prev]);
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
            onClick={() => {
              const url = prompt('Paste a URL (article, teaching, video):');
              if (url?.trim()) {
                setSparks((prev) => [{
                  id: crypto.randomUUID(),
                  body: url.trim(),
                  tag: 'Link',
                  when: new Date().toLocaleDateString(),
                  url: url.trim(),
                }, ...prev]);
              }
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

      {/* Selection actions */}
      {sparkSelected.size > 0 && (
        <div className="card" style={{
          padding: '12px 18px', marginBottom: 16, display: 'flex',
          alignItems: 'center', gap: 10, flexWrap: 'wrap',
          background: 'var(--accent-soft)', borderColor: 'var(--accent)',
        }}>
          <span className="mono" style={{ color: 'var(--accent)' }}>
            {sparkSelected.size} selected
          </span>
          <div style={{ flex: 1 }} />
          {sparkSelected.size >= 2 && (
            <button className="btn small" onClick={mergeSparks}>
              <span className="icon" style={{ width: 14, height: 14 }}>{I.plus}</span> Merge Together
            </button>
          )}
          {encounters.length > 0 && (
            <select
              className="input"
              style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  mergeSparkToFile(e.target.value);
                  e.target.value = '';
                }
              }}>
              <option value="" disabled>Merge to file...</option>
              {encounters.map((enc) => (
                <option key={enc.id} value={enc.id}>{enc.congregantName}</option>
              ))}
            </select>
          )}
          <button
            className="btn small"
            style={{ color: 'var(--accent)' }}
            onClick={() => {
              setSparks((prev) => prev.filter((s) => !sparkSelected.has(s.id)));
              setSparkSelected(new Set());
            }}>
            <span className="icon" style={{ width: 14, height: 14 }}>{I.trash}</span> Delete
          </button>
          <button className="btn ghost small" onClick={() => setSparkSelected(new Set())}>Clear</button>
        </div>
      )}

      {/* Category filter */}
      {sparks.length > 0 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto' }}>
          {['all', ...SPARK_CATEGORIES].map((cat) => (
            <button
              key={cat}
              className={`tab ${sparkFilter === cat ? 'active' : ''}`}
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => setSparkFilter(cat)}>
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Sparks list */}
      {sparks.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: 18 }}>Your sparks inbox is empty</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>Capture ideas, fragments, and connections before they fade</p>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 16 }}>
            Type a thought · Record a voice note · Save a URL · Upload a file · Paste a screenshot
          </p>
        </div>
      ) : (
        <div className="insight-grid">
          {sparks
            .filter((s) => sparkFilter === 'all' || (s.category || 'Uncategorized') === sparkFilter)
            .map((s) => (
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
                  <div className="insight-tag" style={{ flex: 1 }}>{s.tag}</div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button
                      className="btn ghost small"
                      style={{ minHeight: 24, minWidth: 24, padding: 2 }}
                      onClick={() => { setEditingSpark(s.id); setEditSparkText(s.body); }}
                      title="Edit">
                      <span className="icon" style={{ width: 12, height: 12, fontSize: 11 }}>✎</span>
                    </button>
                    <button
                      className="btn ghost small"
                      style={{ minHeight: 24, minWidth: 24, padding: 2 }}
                      onClick={() => findSourcesFor(s)}
                      title="Find related sources">
                      <span className="icon" style={{ width: 12, height: 12 }}>{I.search}</span>
                    </button>
                    <button
                      className="btn ghost small"
                      style={{ minHeight: 24, minWidth: 24, padding: 2 }}
                      onClick={() => setSparks((prev) => prev.filter((x) => x.id !== s.id))}
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
                    />
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="btn small primary"
                        onClick={() => {
                          setSparks((prev) => prev.map((x) => (x.id === s.id ? { ...x, body: editSparkText } : x)));
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

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <select
                    className="mono"
                    value={s.category || 'Uncategorized'}
                    onChange={(e) =>
                      setSparks((prev) => prev.map((x) => (x.id === s.id ? { ...x, category: e.target.value } : x)))
                    }
                    style={{
                      fontSize: 9, background: 'var(--bg-sunken)', border: '1px solid var(--rule-soft)',
                      borderRadius: 3, padding: '2px 4px', color: 'var(--ink-3)', cursor: 'pointer',
                    }}>
                    {SPARK_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <div className="insight-foot">{s.when}</div>
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
}
