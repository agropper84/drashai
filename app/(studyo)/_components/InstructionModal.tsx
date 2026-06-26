'use client';
// Instruction builder modal — create/edit a reusable recipe.
// Format grid, length selector, voice picker, custom instructions.

import { useState, useEffect } from 'react';
import { CURATED_VOICES } from '../_lib/studyo-voices';
import type { StudyoInstruction, OutputFormat, OutputLength } from '../_lib/studyo-types';

const FORMATS: { id: OutputFormat; label: string; desc: string; twoVoice: boolean }[] = [
  { id: 'podcast', label: 'Podcast', desc: 'Two hosts discuss', twoVoice: true },
  { id: 'lecture', label: 'Lecture', desc: 'Solo narration', twoVoice: false },
  { id: 'interview', label: 'Interview', desc: 'Interviewer + expert', twoVoice: true },
  { id: 'socratic', label: 'Socratic', desc: 'Tutor asks questions', twoVoice: false },
  { id: 'summary', label: 'Summary', desc: 'Quick overview', twoVoice: false },
  { id: 'custom', label: 'Custom', desc: 'Describe your own', twoVoice: false },
];

const LENGTHS: { id: OutputLength; label: string; desc: string }[] = [
  { id: 'quick', label: 'Quick', desc: '~5 min · the gist' },
  { id: 'standard', label: 'Standard', desc: '~15 min · balanced' },
  { id: 'deep', label: 'Deep dive', desc: '~30 min+ · thorough' },
];

interface Props {
  onClose: () => void;
  onSave: (instr: StudyoInstruction) => void;
  editing?: StudyoInstruction | null;
}

export function InstructionModal({ onClose, onSave, editing }: Props) {
  const [name, setName] = useState(editing?.name || '');
  const [format, setFormat] = useState<OutputFormat>(editing?.format || 'podcast');
  const [length, setLength] = useState<OutputLength>(editing?.length || 'standard');
  const [voiceA, setVoiceA] = useState(editing?.voiceA || 'ada');
  const [voiceB, setVoiceB] = useState(editing?.voiceB || 'theo');
  const [note, setNote] = useState(editing?.note || '');

  const needsTwoVoices = FORMATS.find(f => f.id === format)?.twoVoice ?? false;

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: editing?.id || crypto.randomUUID(),
      name: name.trim(),
      format,
      length,
      voiceA,
      voiceB: needsTwoVoices ? voiceB : null,
      note: note.trim(),
    });
  };

  return (
    <div className="sy-modal-scrim" onClick={onClose}>
      <div className="sy-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="sy-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✎</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{editing ? 'Edit instruction' : 'New instruction'}</span>
          </div>
          <button className="sy-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Name */}
        <div className="sy-field-label">Name</div>
        <input
          className="sy-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Commute podcast, Exam crammer"
          autoFocus
        />

        {/* Format */}
        <div className="sy-field-label" style={{ marginTop: 16 }}>Format</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {FORMATS.map(f => (
            <button
              key={f.id}
              className={`sy-option-card${format === f.id ? ' active' : ''}`}
              onClick={() => setFormat(f.id)}
            >
              <div className="sy-option-radio">{format === f.id && <div className="sy-option-radio-dot" />}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{f.label}</div>
              <div style={{ fontSize: 11, color: '#8b91a0' }}>{f.desc}</div>
            </button>
          ))}
        </div>

        {/* Length */}
        <div className="sy-field-label" style={{ marginTop: 16 }}>Length &amp; depth</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {LENGTHS.map(l => (
            <button
              key={l.id}
              className={`sy-option-card${length === l.id ? ' active' : ''}`}
              onClick={() => setLength(l.id)}
            >
              <div className="sy-option-radio">{length === l.id && <div className="sy-option-radio-dot" />}</div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{l.label}</div>
              <div style={{ fontSize: 11, color: '#8b91a0' }}>{l.desc}</div>
            </button>
          ))}
        </div>

        {/* Voices */}
        <div className="sy-field-label" style={{ marginTop: 16 }}>
          {needsTwoVoices ? 'First voice' : 'Voice'}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CURATED_VOICES.map(v => (
            <button
              key={v.id}
              className={`sy-voice-chip${voiceA === v.id ? ' active' : ''}`}
              onClick={() => setVoiceA(v.id)}
            >
              <div className="sy-voice-chip-avatar" style={{ background: v.color }}>{v.initials}</div>
              <span>{v.name}</span>
            </button>
          ))}
        </div>

        {needsTwoVoices && (
          <>
            <div className="sy-field-label" style={{ marginTop: 12 }}>Second voice</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CURATED_VOICES.filter(v => v.id !== voiceA).map(v => (
                <button
                  key={v.id}
                  className={`sy-voice-chip${voiceB === v.id ? ' active' : ''}`}
                  onClick={() => setVoiceB(v.id)}
                >
                  <div className="sy-voice-chip-avatar" style={{ background: v.color }}>{v.initials}</div>
                  <span>{v.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Custom instructions */}
        <div className="sy-field-label" style={{ marginTop: 16 }}>Custom instructions</div>
        <textarea
          className="sy-textarea"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="How should it be taught? e.g. 'Quiz me as we go.'"
          rows={3}
        />

        {/* Footer */}
        <div className="sy-modal-footer">
          <button className="sy-btn-outline" onClick={onClose}>Cancel</button>
          <button className="sy-btn-primary" onClick={handleSave} disabled={!name.trim()}>
            Save instruction
          </button>
        </div>
      </div>
    </div>
  );
}
