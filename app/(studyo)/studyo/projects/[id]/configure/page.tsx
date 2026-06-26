'use client';
// Screen 4: Configure output — kind selection, source selection,
// format/length/voices (audio), notes style, question count, instructions.
// UI/UX pass: responsive kind grid + icons (#6), voice previews + "Create a voice" (#7),
// empty-source state (#8), SVG icons (#9), neutral eyebrow + consistent type scale (#12).

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { studyoApi } from '@/app/(studyo)/_lib/studyo-api';
import { CURATED_VOICES, getVoice } from '@/app/(studyo)/_lib/studyo-voices';
import { Icon, Sparkle } from '@/app/(studyo)/_components/StudyoIcons';
import type { StudyoProject, OutputFormat, OutputLength, StudyoVoice } from '@/app/(studyo)/_lib/studyo-types';

type OutputKind = 'audio' | 'transcript' | 'notes' | 'questions' | 'extract';

const KINDS: { id: OutputKind; title: string; desc: string; icon: string }[] = [
  { id: 'audio', title: 'Audio narration', desc: 'Podcast, lecture, tutor & more', icon: 'audio' },
  { id: 'transcript', title: 'Transcript', desc: 'A clean, written record of the speech', icon: 'transcript' },
  { id: 'notes', title: 'Study notes', desc: 'Structured notes you can review', icon: 'notes' },
  { id: 'questions', title: 'Practice questions', desc: 'Quiz yourself on the material', icon: 'questions' },
  { id: 'extract', title: 'Extract audio', desc: 'Pull the audio track out of a video', icon: 'extract' },
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
  { id: 'q5', label: '5 questions', desc: 'Quick check' },
  { id: 'q8', label: '8 questions', desc: 'Standard' },
  { id: 'q15', label: '15 questions', desc: 'Thorough' },
];

export default function ConfigurePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<StudyoProject | null>(null);
  const [loading, setLoading] = useState(true);

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
  const [previewVoice, setPreviewVoice] = useState<string | null>(null);

  useEffect(() => {
    studyoApi.projects.get(id).then(({ project }) => {
      setProject(project);
      setSelMat(new Set(project.material.map(m => m.id)));
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

  if (loading || !project) return <div style={{ color: '#8b91a0' }}>Loading…</div>;

  const needsTwoVoices = FORMATS.find(f => f.id === format)?.twoVoice ?? false;
  const va = getVoice(voiceA);
  const vb = getVoice(voiceB);
  const noMaterial = project.material.length === 0;

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
    // TODO: Wire to generation API (see API_INTEGRATION.md). Passes:
    // { kind, format, length, voiceA, voiceB, notesStyle, qCount, customFormat,
    //   materialIds: [...selMat], note: configNote }
    router.push(`/studyo/projects/${id}/generating`);
  };

  const toggleMat = (matId: string) => {
    setSelMat(prev => {
      const next = new Set(prev);
      if (next.has(matId)) next.delete(matId); else next.add(matId);
      return next;
    });
  };

  // Voice picker — selection button + a separate (valid, non-nested) preview button (#7).
  const togglePreview = (vid: string) => {
    // TODO: play an ElevenLabs sample for this voice (see API_INTEGRATION.md, Stage 3).
    setPreviewVoice(prev => (prev === vid ? null : vid));
  };
  const VoicePick = ({ v, selected, onSelect }: { v: StudyoVoice; selected: boolean; onSelect: () => void }) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <button className={`sy-voice-chip${selected ? ' active' : ''}`} onClick={onSelect} title={`${v.name} — ${v.best}`}>
        <div className="sy-voice-chip-avatar" style={{ background: v.color }}>{v.initials}</div>
        <span>{v.name}</span>
      </button>
      <button
        aria-label={`${previewVoice === v.id ? 'Stop preview of' : 'Preview'} ${v.name}`}
        title="Preview voice"
        onClick={() => togglePreview(v.id)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
          border: '1px solid', borderColor: previewVoice === v.id ? '#D49A5A' : '#343b46',
          background: previewVoice === v.id ? '#221d14' : 'transparent',
          color: previewVoice === v.id ? '#D49A5A' : '#aab0bd',
        }}
      >
        <Icon name={previewVoice === v.id ? 'pause' : 'play'} size={11} stroke={previewVoice === v.id ? '#D49A5A' : '#aab0bd'} />
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: 880 }}>
      <Link href={`/studyo/projects/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8b91a0', textDecoration: 'none' }}>
        <Icon name="back" size={15} /> Back
      </Link>

      {/* Neutral eyebrow — outputs are multi-modal now (#12) */}
      <div className="sy-eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>New output</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 6 }}>{kindHeadings[kind]}</div>
      <div style={{ fontSize: 13, color: '#8b91a0', marginBottom: 24 }}>
        From {project.title} · {selMat.size} of {project.material.length} source{project.material.length !== 1 ? 's' : ''}
      </div>

      {/* 1) Output kind — responsive grid w/ icons (#6) */}
      <div className="sy-field-label">What should we make?</div>
      <div className="sy-kind-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 24 }}>
        {KINDS.map(k => (
          <button key={k.id} className={`sy-option-card${kind === k.id ? ' active' : ''}`} onClick={() => setKind(k.id)}>
            <div className="sy-option-radio">{kind === k.id && <div className="sy-option-radio-dot" />}</div>
            <Icon name={k.icon} size={20} stroke={kind === k.id ? '#D49A5A' : '#8b91a0'} style={{ marginBottom: 8, display: 'block' }} />
            <div style={{ fontWeight: 700, fontSize: 13 }}>{k.title}</div>
            <div style={{ fontSize: 11, color: '#8b91a0', marginTop: 2 }}>{k.desc}</div>
          </button>
        ))}
      </div>

      {/* Empty-source state (#8) */}
      {noMaterial ? (
        <div className="sy-empty-card" style={{ marginBottom: 24 }}>
          This project has no reference material yet. {' '}
          <Link href={`/studyo/projects/${id}/import`} style={{ color: '#D49A5A', textDecoration: 'none' }}>Add a source</Link>
          {' '} before generating.
        </div>
      ) : (
        <>
          {/* 2) Source selection */}
          <div className="sy-field-label">Sources</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {project.material.map(m => (
              <button key={m.id} className={`sy-source-chip${selMat.has(m.id) ? ' active' : ''}`} onClick={() => toggleMat(m.id)}>
                <div className="sy-source-check">{selMat.has(m.id) && <Icon name="check" size={11} stroke="#15181E" />}</div>
                {m.title}
              </button>
            ))}
          </div>
        </>
      )}

      {/* 3) Kind-specific options */}
      {kind === 'audio' && (
        <>
          <div className="sy-field-label">Format</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 20 }}>
            {FORMATS.map(f => (
              <button key={f.id} className={`sy-option-card${format === f.id ? ' active' : ''}`} onClick={() => setFormat(f.id)}>
                <div className="sy-option-radio">{format === f.id && <div className="sy-option-radio-dot" />}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: '#8b91a0' }}>{f.desc}</div>
              </button>
            ))}
          </div>

          {format === 'custom' && (
            <div style={{ marginBottom: 20 }}>
              <input className="sy-input" value={customFormat} onChange={e => setCustomFormat(e.target.value)}
                placeholder="Describe your format (e.g. 'A fireside chat between two historians')" />
            </div>
          )}

          <div className="sy-field-label">Length &amp; depth</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {LENGTHS.map(l => (
              <button key={l.id} className={`sy-option-card${length === l.id ? ' active' : ''}`} onClick={() => setLength(l.id)}>
                <div className="sy-option-radio">{length === l.id && <div className="sy-option-radio-dot" />}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{l.label}</div>
                <div style={{ fontSize: 11, color: '#8b91a0' }}>{l.desc}</div>
              </button>
            ))}
          </div>

          {/* Voices — label row with "Create a voice" entry point (#7) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="sy-field-label" style={{ margin: 0 }}>{needsTwoVoices ? 'Cast your voices' : 'Choose a voice'}</div>
            <Link href="/studyo/voices" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#D49A5A', textDecoration: 'none', fontWeight: 600 }}>
              <Icon name="plus" size={12} stroke="#D49A5A" /> Create a voice
            </Link>
          </div>
          <div style={{ fontSize: 11, color: '#6d7383', marginBottom: 8 }}>
            {needsTwoVoices ? 'Host A' : format === 'lecture' ? 'Narrator' : format === 'socratic' ? 'Tutor' : 'Voice'}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: needsTwoVoices ? 12 : 20 }}>
            {CURATED_VOICES.map(v => (
              <VoicePick key={v.id} v={v} selected={voiceA === v.id} onSelect={() => setVoiceA(v.id)} />
            ))}
          </div>
          {needsTwoVoices && (
            <>
              <div style={{ fontSize: 11, color: '#6d7383', marginBottom: 8 }}>{format === 'interview' ? 'Expert' : 'Host B'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {CURATED_VOICES.filter(v => v.id !== voiceA).map(v => (
                  <VoicePick key={v.id} v={v} selected={voiceB === v.id} onSelect={() => setVoiceB(v.id)} />
                ))}
              </div>
            </>
          )}

          <div className="sy-field-label">Instructions for this {format}</div>
          <textarea className="sy-textarea" value={configNote} onChange={e => setConfigNote(e.target.value)}
            placeholder="Focus on intuition, skip the proofs…" rows={3} />
        </>
      )}

      {kind === 'notes' && (
        <>
          <div className="sy-field-label">Note style</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
            {NOTE_STYLES.map(n => (
              <button key={n.id} className={`sy-option-card${notesStyle === n.id ? ' active' : ''}`} onClick={() => setNotesStyle(n.id)}>
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
              <button key={q.id} className={`sy-option-card${qCount === q.id ? ' active' : ''}`} onClick={() => setQCount(q.id)}>
                <div className="sy-option-radio">{qCount === q.id && <div className="sy-option-radio-dot" />}</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{q.label}</div>
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
        <div style={{ background: '#1B1F27', border: '1px solid #242932', borderRadius: 14, padding: 20, color: '#aab0bd', fontSize: 14, lineHeight: 1.6, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <Icon name="extract" size={22} stroke="#D49A5A" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>We&apos;ll lift the audio track straight out of your selected video, clean and normalize it, and save it as a playable audio file.</span>
        </div>
      )}

      {/* Additional instructions (all kinds) */}
      <details className="sy-extra-instructions" open={!!configNote}>
        <summary className="sy-extra-instructions-toggle">
          <Icon name="edit" size={13} stroke="#6d7383" />
          <span>{configNote ? 'Custom instructions' : 'Add custom instructions'}</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6d7383" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sy-extra-chevron"><polyline points="6 9 12 15 18 9"/></svg>
        </summary>
        <textarea
          className="sy-textarea"
          value={configNote}
          onChange={e => setConfigNote(e.target.value)}
          placeholder="e.g. Focus on intuition over math. Use analogies. Quiz me after each section. Keep it conversational..."
          rows={3}
          style={{ marginTop: 8 }}
        />
      </details>

      {/* 4) Summary bar */}
      <div className="sy-summary-bar">
        <div className="sy-summary-text">{summaryParts.join(' · ')}</div>
        <button className="sy-btn-primary" onClick={handleGenerate} disabled={selMat.size === 0}
          style={{ fontSize: 14, padding: '12px 24px', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Sparkle size={14} color="#15181E" /> {kind === 'extract' ? 'Convert' : 'Generate'}
        </button>
      </div>
      {selMat.size === 0 && !noMaterial && (
        <div style={{ fontSize: 12, color: '#C97D7D', marginTop: 8, textAlign: 'right' }}>Select at least one source to generate.</div>
      )}
      <div className="sy-summary-credit">
        {kind === 'audio' ? 'Script by Claude · Voices by ElevenLabs' :
         kind === 'extract' ? 'Audio extracted with ElevenLabs' :
         'Generated by Claude'}
      </div>
    </div>
  );
}
