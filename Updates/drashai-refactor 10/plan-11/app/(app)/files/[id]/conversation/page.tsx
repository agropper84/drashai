'use client';
// Plan 11 — Conversation tab with cleaner type AND a small file-sparks
// subsection at the bottom (Insights tab is gone).

import { useEffect, useRef, useState } from 'react';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useModal } from '@/app/_components/modals/ModalProvider';
import { FileSparksTab } from '@/app/_components/files/FileSparksTab';

export default function ConversationTab() {
  const { id, file, patch } = useActiveFile();
  const { open } = useModal();
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const lines = (file.transcript || '').split('\n').filter((l: string) => l.trim());
  const hasSpeakers = lines.some((l) => {
    const c = l.indexOf(':');
    return c > 0 && c < 30;
  });

  return (
    <div>
      <h2 className="fd-section-title">
        <span>Conversation</span>
        <span className="heb">שיחה</span>
        <span className="accent-line"/>
        <button className="btn ghost small" onClick={() => open('record', { fileId: file.id })}>
          Continue recording
        </button>
      </h2>

      {hasSpeakers && (
        <div className="fd-transcript" data-selectable="true">
          {lines.map((line, i) => {
            const colonIdx = line.indexOf(':');
            const has = colonIdx > 0 && colonIdx < 30;
            const speaker = has ? line.substring(0, colonIdx).trim() : '';
            const text = has ? line.substring(colonIdx + 1).trim() : line;
            return (
              <div key={i} className="fd-utterance">
                <div className="fd-utt-meta">
                  {String(Math.floor(i * 0.5)).padStart(2, '0')}:{String((i * 30) % 60).padStart(2, '0')}
                  {speaker && <span className="fd-utt-meta-speaker">{speaker}</span>}
                </div>
                <div className="fd-utt-text">{text}</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: hasSpeakers ? 32 : 0 }}>
        <textarea
          className="input serif"
          rows={hasSpeakers ? 4 : 10}
          value={transcriptDraft}
          onChange={(e) => setTranscriptDraft(e.target.value)}
          placeholder="Paste or type the encounter transcript here..."
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
          <button className="btn primary small" onClick={saveTranscript} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="fd-notes-block">
        <h2 className="fd-section-title">
          <span>Private notes</span>
          <span className="heb">הערות</span>
          <span className="accent-line"/>
        </h2>
        <textarea
          className="fd-notes-textarea"
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Anything you want to remember — themes, parsha connections, a phrase that struck you..."
        />
      </div>

      <div className="fd-notes-block">
        <FileSparksTab file={file}/>
      </div>
    </div>
  );
}
