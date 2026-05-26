'use client';
// Conversation tab — transcript with editable speaker tags, notes, sparks.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useModal } from '@/app/_components/modals/ModalProvider';
import { useRecordingSession } from '@/app/_components/recording/RecordingProvider';
import { FileSparksTab } from '@/app/_components/files/FileSparksTab';
import { I } from '@/app/_components/Icons';

interface Utterance {
  speaker: string;
  text: string;
}

function parseTranscript(raw: string): Utterance[] {
  if (!raw.trim()) return [];
  const lines = raw.split('\n').filter((l) => l.trim());
  return lines.map((line) => {
    const colonIdx = line.indexOf(':');
    const hasSpeaker = colonIdx > 0 && colonIdx < 30;
    return {
      speaker: hasSpeaker ? line.substring(0, colonIdx).trim() : '',
      text: hasSpeaker ? line.substring(colonIdx + 1).trim() : line,
    };
  });
}

function serializeTranscript(utts: Utterance[]): string {
  return utts.map((u) => u.speaker ? `${u.speaker}: ${u.text}` : u.text).join('\n');
}

const SPEAKER_CYCLE = ['Speaker 1', 'Speaker 2', 'Speaker 3', ''];

export default function ConversationTab() {
  const { id, file, patch } = useActiveFile();
  const { open } = useModal();
  const rec = useRecordingSession();
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [rawMode, setRawMode] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (file) {
      setTranscriptDraft(file.transcript || '');
      setUtterances(parseTranscript(file.transcript || ''));
      setNotes(file.notes || '');
      setEditingIdx(null);
    }
  }, [id, file?.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!file) return null;

  const hasSpeakers = utterances.some((u) => u.speaker);
  const isRecording = rec.session?.fileId === file.id;

  const saveTranscript = async () => {
    setSaving(true);
    const text = rawMode ? transcriptDraft : serializeTranscript(utterances);
    await patch(file.id, { transcript: text });
    if (!rawMode) {
      setTranscriptDraft(text);
    } else {
      setUtterances(parseTranscript(text));
    }
    setSaving(false);
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => patch(file.id, { notes: text }), 1000);
  };

  const cycleSpeaker = (idx: number) => {
    setUtterances((prev) => {
      const next = [...prev];
      const current = next[idx].speaker;
      const cycleIdx = SPEAKER_CYCLE.indexOf(current);
      next[idx] = { ...next[idx], speaker: SPEAKER_CYCLE[(cycleIdx + 1) % SPEAKER_CYCLE.length] };
      return next;
    });
  };

  const startEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditText(utterances[idx].text);
  };

  const saveEdit = (idx: number) => {
    setUtterances((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], text: editText };
      return next;
    });
    setEditingIdx(null);
  };

  const deleteUtterance = (idx: number) => {
    setUtterances((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <h2 className="fd-section-title">
        <span>Conversation</span>
        <span className="heb">שיחה</span>
        <span className="accent-line"/>
        <button className="btn ghost small" onClick={() => open('record', { fileId: file.id })}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="1" width="6" height="12" rx="3"/>
            <path d="M19 10v1a7 7 0 01-14 0v-1"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          {isRecording ? 'Recording...' : file.transcript?.trim() ? 'Continue recording' : 'Start recording'}
        </button>
      </h2>

      {utterances.length > 0 && !rawMode && (
        <>
          <div className="fd-transcript" data-selectable="true">
            {utterances.map((utt, i) => (
              <div key={i} className="fd-utterance">
                <div className="fd-utt-meta">
                  {utt.speaker ? (
                    <button
                      className={`fd-utt-speaker-btn fd-speaker-${utt.speaker === 'Speaker 1' || utt.speaker.match(/^(Dr|Physician|Rabbi)/i) ? '1' : utt.speaker === 'Speaker 2' || utt.speaker.match(/^(Pt|Patient|Family|Congregant)/i) ? '2' : '3'}`}
                      onClick={() => cycleSpeaker(i)}
                      title="Click to change speaker"
                    >
                      {utt.speaker}
                    </button>
                  ) : (
                    <button
                      className="fd-utt-speaker-btn fd-speaker-none"
                      onClick={() => cycleSpeaker(i)}
                      title="Assign speaker"
                    >
                      +
                    </button>
                  )}
                </div>
                <div className="fd-utt-text-wrap">
                  {editingIdx === i ? (
                    <div className="fd-utt-edit">
                      <textarea
                        className="fd-utt-edit-input"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(i); }
                          if (e.key === 'Escape') setEditingIdx(null);
                        }}
                      />
                      <div className="fd-utt-edit-actions">
                        <button className="btn ghost small" onClick={() => setEditingIdx(null)} style={{ fontSize: 11, padding: '2px 8px' }}>Cancel</button>
                        <button className="btn primary small" onClick={() => saveEdit(i)} style={{ fontSize: 11, padding: '2px 8px' }}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="fd-utt-text" onClick={() => startEdit(i)} title="Click to edit">
                      {utt.text}
                    </div>
                  )}
                </div>
                {editingIdx !== i && (
                  <div className="fd-utt-actions">
                    <button className="fd-utt-action" onClick={() => startEdit(i)} title="Edit">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button className="fd-utt-action delete" onClick={() => deleteUtterance(i)} title="Delete">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'space-between' }}>
            <button className="btn ghost small" onClick={() => setRawMode(true)} style={{ fontSize: 11 }}>
              Edit raw text
            </button>
            <button className="btn primary small" onClick={saveTranscript} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </>
      )}

      {(rawMode || utterances.length === 0) && (
        <div style={{ marginTop: rawMode ? 0 : 0 }}>
          {rawMode && (
            <button className="btn ghost small" onClick={() => { setRawMode(false); setUtterances(parseTranscript(transcriptDraft)); }} style={{ fontSize: 11, marginBottom: 8 }}>
              Back to formatted view
            </button>
          )}
          <textarea
            className="input serif"
            rows={rawMode ? 12 : 10}
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
      )}

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
