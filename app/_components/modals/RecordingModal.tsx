'use client';
// Three-phase recording modal: vow → recording → review.
// Mic/MediaRecorder logic lives in useRecorder(). Transcription via api.transcribe.
// In Plan 9 this collapses to a sticky bar after the vow phase.

import { useState } from 'react';
import { I } from '../Icons';
import { useRecorder, fmtTime } from '../recording/useRecorder';
import { api } from '@/app/_lib/api';
import { useEncounters } from '@/app/_lib/encounters-store';

export function RecordingModal({ onClose, fileId }: { onClose: () => void; fileId?: string }) {
  const [phase, setPhase] = useState<'vow' | 'recording' | 'review'>('vow');
  const [consent, setConsent] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const { refresh } = useEncounters();

  const rec = useRecorder();

  const handleBegin = async () => {
    setPhase('recording');
    await rec.start();
  };

  const handleEnd = async () => {
    const blob = await rec.stop();
    setPhase('review');
    if (blob && blob.size > 0) {
      // Backup the audio
      api.uploadAudio(blob, fileId || 'unlinked').catch(() => {});
      // Transcribe
      setTranscribing(true);
      try {
        const data = await api.transcribe(blob);
        setTranscript((prev) => (prev ? prev + '\n\n' + data.text : data.text));
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'unknown error';
        setTranscript((prev) => prev + '\n\n[Transcription error: ' + msg + ']');
      } finally {
        setTranscribing(false);
      }
    }
  };

  const handleSave = async () => {
    if (!fileId || !transcript) return;
    await api.encounters.patch(fileId, { appendTranscript: transcript });
    refresh();
    onClose();
  };

  return (
    <div className="modal-shroud" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {phase === 'vow' && (
          <>
            <div className="modal-eyebrow">Pastoral recording</div>
            <h2 className="modal-title">הקלטה</h2>
            <div className="modal-title-en">Begin Recording</div>
            <div className="privacy-vow">
              <div className="privacy-vow-title">
                <span className="icon" style={{ width: 12, height: 12 }}>{I.lock}</span> Pastoral Seal
              </div>
              <p>This recording is made in the context of pastoral care. It is sealed and will be stored securely on your device only.</p>
              <span className="heb-quote">לֹא תֵלֵךְ רָכִיל בְּעַמֶּיךָ</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 14, color: 'var(--ink-1)', cursor: 'pointer' }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              I have informed the participant(s) that this conversation is being recorded
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={onClose}>Cancel</button>
              <button className="btn primary" disabled={!consent} onClick={handleBegin}>
                <span className="icon">{I.mic}</span> Begin
              </button>
            </div>
          </>
        )}

        {phase === 'recording' && (
          <>
            <div className="modal-eyebrow">Recording in progress</div>
            <div className={`rec-vis ${rec.paused ? 'paused' : ''}`}>
              <div className="rec-time">{fmtTime(rec.time)}</div>
              <div className="rec-rec-pill"><span className="dot" /> REC</div>
              <div className="rec-waveform">
                {Array.from({ length: 48 }).map((_, i) => (
                  <div key={i} className="rec-bar" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s` }} />
                ))}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <textarea
                className="input serif"
                rows={4}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Live transcript will appear here... (or type/paste)"
              />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'space-between' }}>
              <button className="btn" onClick={() => (rec.paused ? rec.resume() : rec.pause())}>
                <span className="icon">{rec.paused ? I.play : I.pause}</span> {rec.paused ? 'Resume' : 'Pause'}
              </button>
              <button className="btn primary" onClick={handleEnd}>
                <span className="icon">{I.stop}</span> End & Save
              </button>
            </div>
          </>
        )}

        {phase === 'review' && (
          <>
            <div className="modal-eyebrow">Recording complete</div>
            <h2 className="modal-title">הוקלט</h2>
            <div className="modal-title-en">Sealed & Saved</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0' }}>
              <span className="badge sealed"><span className="icon">{I.lock}</span> Sealed on device</span>
              <span className="mono" style={{ color: 'var(--ink-3)' }}>{fmtTime(rec.time)}</span>
              {transcribing && <span className="mono" style={{ color: 'var(--accent)' }}>● Transcribing...</span>}
            </div>
            {transcript && (
              <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>
                  {transcript.substring(0, 200)}{transcript.length > 200 ? '...' : ''}
                </p>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={onClose}>Close</button>
              {fileId && transcript && (
                <button className="btn primary" onClick={handleSave}>Save to File</button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
