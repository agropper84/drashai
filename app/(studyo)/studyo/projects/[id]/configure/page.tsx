'use client';
// Screen 4: Configure output — kind selection, source selection,
// format/length/voices (audio), notes style, question count, instructions.

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { studyoApi } from '@/app/(studyo)/_lib/studyo-api';
import { CURATED_VOICES, getVoice } from '@/app/(studyo)/_lib/studyo-voices';
import type { StudyoProject, OutputFormat, OutputLength } from '@/app/(studyo)/_lib/studyo-types';

type OutputKind = 'audio' | 'transcript' | 'notes' | 'questions' | 'extract';

const KINDS: { id: OutputKind; title: string; desc: string }[] = [
  { id: 'audio', title: 'Audio narration', desc: 'Podcast, lecture, tutor & more' },
  { id: 'transcript', title: 'Transcript', desc: 'A clean, written record of the speech' },
  { id: 'notes', title: 'Study notes', desc: 'Structured notes you can review' },
  { id: 'questions', title: 'Practice questions', desc: 'Quiz yourself on the material' },
  { id: 'extract', title: 'Extract audio', desc: 'Pull the audio track out of a video' },
];

const FORMATS: { id: OutputFormat; label: string; desc: string; twoVoice: boolean }[] = [
  { id: 'podcast', label: 'Podcast', desc: 'Two hosts discuss', twoVoice: true },
  { id: 'lecture', label: 'Lecture', desc: 'Solo narration', twoVoice: false },
  { id: 'interview', label: 'Interview', desc: 'Interviewer + expert', twoVoice: true },
  { id: 'socratic', label: 'Socratic tutor', desc: 'Teaches by asking', twoVoice: false },
  { id: 'summary', label: 'Quick summary', desc: 'Short overview', twoVoice: false },
  { id: 'custom', label: 'Describe your own', desc: 'Free-form format', twoVoice: false },
];

const LENGTHS: { id: OutputLength; label: string; desc: string }[] = [
  { id: 'quick', label: 'Quick', desc: '~5 min · the gist' },
  { id: 'standard', label: 'Standard', desc: '~15 min · balanced' },
  { id: 'deep', label: 'Deep dive', desc: '~30 min+ · thorough' },
];

const NOTE_STYLES = [
  { id: 'outline', label: 'Outline', desc: 'Headings + bullets' },
  { id: 'cornell', label: 'Cornell', desc: 'Cues / notes / summary' },
  { id: 'summary', label: 'Prose summary', desc: 'Flowing paragraphs' },
];

const Q_COUNTS = [
  { id: 'q5', label: '5', desc: 'Quick check' },
  { id: 'q8', label: '8', desc: 'Standard' },
  { id: 'q15', label: '15', desc: 'Thorough' },
];

export default function ConfigurePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<StudyoProject | null>(null);
  const [loading, setLoading] = useState(true);

  // Config state
  const [kind, setKind] = useState<OutputKind>('audio');
  const [selMat, setSelMat] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<OutputFormat>('podcast');
  const [length, setLength] = useState<OutputLength>('standard');
  const [voiceA, setVoiceA] = useState('ada');
  const [voiceB, setVoiceB] = useState('theo');
  const [notesStyle, setNotesStyle] = useState('outline');
  const [qCount, setQCount] = useState('q8');
  const [configNote, setConfigNote] = useState('');
  const [customFormat, setCustomFormat] = useState('');

  useEffect(() => {
    studyoApi.projects.get(id).then(({ project }) => {
      setProject(project);
      // Select all materials by default
      setSelMat(new Set(project.material.map(m => m.id)));

      // If opened from an instruction "Use →", pre-fill config
      const instrId = searchParams.get('instr');
      if (instrId) {
        const instr = project.instructions.find(i => i.id === instrId);
        if (instr) {
          setKind('audio');
          setFormat(instr.format);
          setLength(instr.length);
          setVoiceA(instr.voiceA);
          if (instr.voiceB) setVoiceB(instr.voiceB);
          setConfigNote(instr.note);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, searchParams]);

  if (loading || !project) return <div style={{ color: '#8b91a0' }}>Loading...</div>;

  const needsTwoVoices = FORMATS.find(f => f.id === format)?.twoVoice ?? false;
  const va = getVoice(voiceA);
  const vb = getVoice(voiceB);

  const kindHeadings: Record<OutputKind, string> = {
    audio: 'How should it sound?',
    transcript: 'Generate a transcript',
    notes: 'Generate study notes',
    questions: 'Generate practice questions',
    extract: 'Extract audio',
  };

  const summaryParts: string[] = [];
  if (kind === 'audio') {
    summaryParts.push(format.charAt(0).toUpperCase() + format.slice(1));
    summaryParts.push(length.charAt(0).toUpperCase() + length.slice(1));
    summaryParts.push(needsTwoVoices ? `${va?.name} & ${vb?.name}` : va?.name || '');
  } else if (kind === 'notes') summaryParts.push(`Notes (${notesStyle})`);
  else if (kind === 'questions') summaryParts.push(`${qCount.replace('q', '')} questions`);
  else summaryParts.push(kind.charAt(0).toUpperCase() + kind.slice(1));
  summaryParts.push(`${selMat.size} source${selMat.size !== 1 ? 's' : ''}`);

  const handleGenerate = () => {
    // TODO: Wire to generation API
    router.push(`/studyo/projects/${id}/generating`);
  };

  const toggleMat = (matId: string) => {
    setSelMat(prev => {
      const next = new Set(prev);
      if (next.has(matId)) next.delete(matId);
      else next.add(matId);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 880 }}>
      <Link href={`/studyo/projects/${id}`} style={{ fontSize: 13, color: '#8b91a0', textDecoration: 'none' }}>← Back</Link>

      <div className="sy-eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>New audio file</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 6 }}>
        {kindHeadings[kind]}
      </div>
      <div style={{ fontSize: 13, color: '#8b91a0', marginBottom: 24 }}>
        From {project.title} · {selMat.size} of {project.material.length} sources
      </div>

      {/* 1) Output kind */}
      <div className="sy-field-label">What should we make?</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 }}>
        {KINDS.map(k => (
          <button
            key={k.id}
            className={`sy-option-card${kind === k.id ? ' active' : ''}`}
            onClick={() => setKind(k.id)}
          >
            <div className="sy-option-radio">{kind === k.id && <div className="sy-option-radio-dot" />}</div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{k.title}</div>
            <div style={{ fontSize: 11, color: '#8b91a0', marginTop: 2 }}>{k.desc}</div>
          </button>
        ))}
      </div>

      {/* 2) Source selection */}
      {project.material.length > 0 && (
        <>
          <div className="sy-field-label">Sources</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {project.material.map(m => (
              <button
                key={m.id}
                className={`sy-source-chip${selMat.has(m.id) ? ' active' : ''}`}
                onClick={() => toggleMat(m.id)}
              >
                <div className="sy-source-check">{selMat.has(m.id) ? '✓' : ''}</div>
                {m.title}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 3) Kind-specific options */}
      {kind === 'audio' && (
        <>
          {/* Format */}
          <div className="sy-field-label">Format</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
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

          {format === 'custom' && (
            <div style={{ marginBottom: 20 }}>
              <input
                className="sy-input"
                value={customFormat}
                onChange={e => setCustomFormat(e.target.value)}
                placeholder="Describe your format (e.g. 'A fireside chat between two historians')"
              />
            </div>
          )}

          {/* Length */}
          <div className="sy-field-label">Length &amp; depth</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
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
          <div className="sy-field-label">
            {needsTwoVoices ? 'Cast your voices' : 'Choose a voice'}
          </div>
          <div style={{ fontSize: 11, color: '#6d7383', marginBottom: 8 }}>
            {needsTwoVoices ? 'Host A' : format === 'lecture' ? 'Narrator' : format === 'socratic' ? 'Tutor' : 'Voice'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: needsTwoVoices ? 12 : 20 }}>
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
              <div style={{ fontSize: 11, color: '#6d7383', marginBottom: 8 }}>
                {format === 'interview' ? 'Expert' : 'Host B'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
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

          {/* Instructions */}
          <div className="sy-field-label">Instructions for this {format}</div>
          <textarea
            className="sy-textarea"
            value={configNote}
            onChange={e => setConfigNote(e.target.value)}
            placeholder="Focus on intuition, skip the proofs..."
            rows={3}
          />
        </>
      )}

      {kind === 'notes' && (
        <>
          <div className="sy-field-label">Note style</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {NOTE_STYLES.map(n => (
              <button
                key={n.id}
                className={`sy-option-card${notesStyle === n.id ? ' active' : ''}`}
                onClick={() => setNotesStyle(n.id)}
              >
                <div className="sy-option-radio">{notesStyle === n.id && <div className="sy-option-radio-dot" />}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{n.label}</div>
                <div style={{ fontSize: 11, color: '#8b91a0' }}>{n.desc}</div>
              </button>
            ))}
          </div>
          <div className="sy-field-label">Instructions</div>
          <textarea className="sy-textarea" value={configNote} onChange={e => setConfigNote(e.target.value)} placeholder="Any specific focus areas?" rows={3} />
        </>
      )}

      {kind === 'questions' && (
        <>
          <div className="sy-field-label">How many questions?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {Q_COUNTS.map(q => (
              <button
                key={q.id}
                className={`sy-option-card${qCount === q.id ? ' active' : ''}`}
                onClick={() => setQCount(q.id)}
              >
                <div className="sy-option-radio">{qCount === q.id && <div className="sy-option-radio-dot" />}</div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>{q.label}</div>
                <div style={{ fontSize: 11, color: '#8b91a0' }}>{q.desc}</div>
              </button>
            ))}
          </div>
          <div className="sy-field-label">Instructions</div>
          <textarea className="sy-textarea" value={configNote} onChange={e => setConfigNote(e.target.value)} placeholder="Focus on definitions? Application questions? Multiple choice?" rows={3} />
        </>
      )}

      {kind === 'transcript' && (
        <>
          <div className="sy-field-label">Instructions</div>
          <textarea className="sy-textarea" value={configNote} onChange={e => setConfigNote(e.target.value)} placeholder="Any specific formatting preferences?" rows={3} />
        </>
      )}

      {kind === 'extract' && (
        <div style={{ background: '#1B1F27', border: '1px solid #242932', borderRadius: 14, padding: 20, color: '#aab0bd', fontSize: 14, lineHeight: 1.6 }}>
          We'll lift the audio track straight out of your selected video, clean and normalize it, and save it as a playable audio file.
        </div>
      )}

      {/* 4) Summary bar */}
      <div className="sy-summary-bar">
        <div className="sy-summary-text">{summaryParts.join(' · ')}</div>
        <button className="sy-btn-primary" onClick={handleGenerate} disabled={selMat.size === 0} style={{ fontSize: 14, padding: '12px 24px' }}>
          ✦ {kind === 'extract' ? 'Convert' : 'Generate'}
        </button>
      </div>
      <div className="sy-summary-credit">
        {kind === 'audio' ? 'Script by Claude · Voices by ElevenLabs' :
         kind === 'extract' ? 'Audio extracted with ElevenLabs' :
         'Generated by Claude'}
      </div>
    </div>
  );
}
