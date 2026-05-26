'use client';
// Plan 5 — B4 fix: also resync when file.updatedAt changes, so external refreshes
// don't get blown away by stale local state.

import { useEffect, useRef, useState } from 'react';
import { I } from '@/app/_components/Icons';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useModal } from '@/app/_components/modals/ModalProvider';

export default function ConversationTab() {
  const { id, file, patch } = useActiveFile();
  const { open } = useModal();
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // B4 — re-sync when file.updatedAt changes (e.g. recording modal saved).
  useEffect(() => {
    if (file) {
      setTranscriptDraft(file.transcript || '');
      setNotes(file.notes || '');
    }
  }, [id, file?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!file) return null;

  const saveTranscript = async () => {
    setSaving(true);
    await patch(file.id, { transcript: transcriptDraft });
    setSaving(false);
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => patch(file.id, { notes: text }), 1000);
  };

  return (
    <div>
      <div className="section-head">
        <div>
          <h2 className="section-title">שיחה</h2>
          <div className="section-title-en">Conversation</div>
        </div>
        <button className="btn small" onClick={() => open('record', { fileId: file.id })}>
          <span className="icon">{I.mic}</span> Record
        </button>
      </div>

      {file.transcript && file.transcript.includes(':') && (
        <div className="transcript" style={{ marginBottom: 20 }}>
          {file.transcript.split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => {
            const colonIdx = line.indexOf(':');
            const hasSpeaker = colonIdx > 0 && colonIdx < 30;
            const speaker = hasSpeaker ? line.substring(0, colonIdx).trim() : '';
            const text = hasSpeaker ? line.substring(colonIdx + 1).trim() : line;
            return (
              <div key={i} className="utterance">
                <div className="utterance-time">
                  {String(Math.floor(i * 0.5)).padStart(2, '0')}:{String((i * 30) % 60).padStart(2, '0')}
                </div>
                <div>
                  {speaker && <span className="utterance-speaker">{speaker}</span>}
                  <div className="utterance-text">{text}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <textarea
        className="input serif"
        rows={8}
        value={transcriptDraft}
        onChange={(e) => setTranscriptDraft(e.target.value)}
        placeholder={'Paste or type the encounter transcript here...\n\nFormat with speaker labels:\nRabbi: How are you feeling today?\nDavid: We\'ve been thinking a lot about mom...'}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn primary" onClick={saveTranscript} disabled={saving}>
          {saving ? 'Saving...' : 'Save Transcript'}
        </button>
      </div>

      <hr className="divider" />

      <div className="section-head">
        <div>
          <h2 className="section-title" style={{ fontSize: 24 }}>הערות</h2>
          <div className="section-title-en">Private Notes</div>
        </div>
      </div>
      <textarea
        className="input serif"
        rows={4}
        value={notes}
        onChange={(e) => handleNotesChange(e.target.value)}
        placeholder="Your private notes, themes to explore, relevant parsha connections..."
      />
    </div>
  );
}
