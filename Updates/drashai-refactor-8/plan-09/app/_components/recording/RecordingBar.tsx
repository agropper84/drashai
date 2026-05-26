'use client';
// Pinned to the bottom-right corner. Visible only when a recording is in
// flight. Survives route navigation. Provides the four primary actions:
// pause/resume, mark moment (with optional inline label), end & save.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { EtherealVis } from './EtherealVis';
import { useRecordingSession } from './RecordingProvider';
import { useEncounters } from '@/app/_lib/encounters-store';
import { api } from '@/app/_lib/api';
import { fmtTime } from './useRecorder';

export function RecordingBar() {
  const router = useRouter();
  const rec = useRecordingSession();
  const { patch } = useEncounters();
  const [labelDraft, setLabelDraft] = useState('');
  const [ending, setEnding] = useState(false);

  if (!rec.session) return null;

  const handleMark = async () => {
    const label = labelDraft.trim();
    await rec.markMomentWithSpark(label || undefined);
    setLabelDraft('');
  };

  const handleEnd = async () => {
    if (!rec.session) return;
    setEnding(true);
    const fileId = rec.session.fileId;
    const blob = await rec.stop();
    if (blob && blob.size > 0) {
      api.uploadAudio(blob, fileId).catch(() => {});
      try {
        const data = await api.transcribe(blob);
        if (data.text) {
          await patch(fileId, { appendTranscript: data.text });
        }
      } catch (err) {
        console.error('[recording bar] transcribe failed:', err);
      }
    }
    setEnding(false);
    router.push(`/files/${fileId}/conversation`);
  };

  return (
    <div className={`recording-bar${rec.paused ? ' paused' : ''}`} role="region" aria-label="Recording in progress">
      <EtherealVis size={32} level={rec.level} paused={rec.paused}/>

      <div className="recording-bar-meta">
        <div className="recording-bar-time">{fmtTime(rec.time)}</div>
        <div className="recording-bar-status">
          {ending ? 'Saving…' : rec.paused ? 'Paused' : `${rec.moments.length} moment${rec.moments.length === 1 ? '' : 's'}`}
        </div>
      </div>

      <input
        className="recording-bar-label"
        value={labelDraft}
        onChange={(e) => setLabelDraft(e.target.value)}
        placeholder="Label a moment…"
        onKeyDown={(e) => { if (e.key === 'Enter') handleMark(); }}
        disabled={ending}
      />

      <button
        type="button"
        className="recording-bar-btn flag"
        onClick={handleMark}
        title="Mark moment (⚑)"
        disabled={ending}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 21V4M4 4l13 0 -3 4 3 4H4"/>
        </svg>
      </button>

      <button
        type="button"
        className="recording-bar-btn pause"
        onClick={() => (rec.paused ? rec.resume() : rec.pause())}
        title={rec.paused ? 'Resume' : 'Pause'}
        disabled={ending}>
        {rec.paused ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        )}
      </button>

      <button
        type="button"
        className="recording-bar-btn end"
        onClick={handleEnd}
        title="End & save"
        disabled={ending}>
        {ending ? '…' : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="1"/></svg>
        )}
      </button>
    </div>
  );
}
