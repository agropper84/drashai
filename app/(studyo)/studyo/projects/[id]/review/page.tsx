'use client';
// Script review page — shows the generated script/transcript before audio
// generation. User can edit lines, reorder, delete, add, and provide
// revision notes for Claude to regenerate.

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { studyoApi } from '@/app/(studyo)/_lib/studyo-api';
import { getVoice } from '@/app/(studyo)/_lib/studyo-voices';
import { Icon, Sparkle } from '@/app/(studyo)/_components/StudyoIcons';
import type { StudyoProject } from '@/app/(studyo)/_lib/studyo-types';

interface ScriptLine {
  speaker: string;
  text: string;
}

interface Script {
  title: string;
  lines?: ScriptLine[];
  sections?: { h: string; items: string[] }[];
  questions?: { q: string; a: string }[];
}

type Phase = 'generating' | 'review' | 'revising' | 'producing';

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [project, setProject] = useState<StudyoProject | null>(null);
  const [phase, setPhase] = useState<Phase>('generating');
  const [script, setScript] = useState<Script | null>(null);
  const [error, setError] = useState('');
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [revisionNote, setRevisionNote] = useState('');

  // Config passed via query params
  const kind = searchParams.get('kind') || 'audio';
  const format = searchParams.get('format') || 'podcast';
  const length = searchParams.get('length') || 'standard';
  const voiceAId = searchParams.get('voiceA') || 'ada';
  const voiceBId = searchParams.get('voiceB') || 'theo';
  const note = searchParams.get('note') || '';
  const matIds = searchParams.get('matIds') || '';
  const notesStyle = searchParams.get('notesStyle') || 'outline';
  const qCount = searchParams.get('qCount') || 'q8';
  const customFormat = searchParams.get('customFormat') || '';

  const va = getVoice(voiceAId);
  const vb = getVoice(voiceBId);
  const isAudio = kind === 'audio' || kind === 'extract';

  useEffect(() => {
    studyoApi.projects.get(id).then(({ project }) => {
      setProject(project);
      generateScript(project);
    }).catch(() => setError('Failed to load project'));
  }, [id]);

  const generateScript = async (proj: StudyoProject, extraNote?: string) => {
    setPhase(extraNote ? 'revising' : 'generating');
    setError('');
    try {
      const res = await fetch('/api/studyo/generate/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: id,
          kind, format, length,
          voiceA: voiceAId, voiceB: voiceBId,
          materialIds: matIds ? matIds.split(',') : [],
          note: [note, extraNote].filter(Boolean).join('\n\n'),
          notesStyle, qCount, customFormat,
          memory: proj.memory,
        }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const { script: s } = await res.json();
      setScript(s);
      setPhase('review');
    } catch (err: any) {
      setError(err.message || 'Generation failed');
      setPhase('review');
    }
  };

  const handleRevise = () => {
    if (!revisionNote.trim() || !project) return;
    setRevisionNote('');
    generateScript(project, revisionNote.trim());
  };

  const editLine = (idx: number) => {
    if (!script?.lines) return;
    setEditingIdx(idx);
    setEditText(script.lines[idx].text);
  };

  const saveLine = (idx: number) => {
    if (!script?.lines) return;
    const updated = [...script.lines];
    updated[idx] = { ...updated[idx], text: editText };
    setScript({ ...script, lines: updated });
    setEditingIdx(null);
  };

  const deleteLine = (idx: number) => {
    if (!script?.lines) return;
    setScript({ ...script, lines: script.lines.filter((_, i) => i !== idx) });
  };

  const moveLine = (idx: number, dir: -1 | 1) => {
    if (!script?.lines) return;
    const target = idx + dir;
    if (target < 0 || target >= script.lines.length) return;
    const updated = [...script.lines];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setScript({ ...script, lines: updated });
  };

  const cycleSpeaker = (idx: number) => {
    if (!script?.lines) return;
    const updated = [...script.lines];
    updated[idx] = { ...updated[idx], speaker: updated[idx].speaker === 'A' ? 'B' : 'A' };
    setScript({ ...script, lines: updated });
  };

  const addLine = () => {
    if (!script?.lines) return;
    const lastSpeaker = script.lines[script.lines.length - 1]?.speaker || 'A';
    setScript({ ...script, lines: [...script.lines, { speaker: lastSpeaker === 'A' ? 'B' : 'A', text: '' }] });
    setEditingIdx(script.lines.length);
    setEditText('');
  };

  const handleProduce = () => {
    // TODO: Wire to TTS pipeline — for now save as output
    router.push(`/studyo/projects/${id}`);
  };

  const lineCount = script?.lines?.length || 0;
  const wordCount = script?.lines?.reduce((sum, l) => sum + l.text.split(/\s+/).length, 0) || 0;
  const estMinutes = Math.max(1, Math.round(wordCount / 150));

  return (
    <div style={{ maxWidth: 880 }}>
      <Link href={`/studyo/projects/${id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8b91a0', textDecoration: 'none', marginBottom: 18 }}>
        <Icon name="back" size={15} /> Back to project
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="sy-eyebrow" style={{ marginBottom: 6 }}>
            {phase === 'generating' ? 'Generating script...' : phase === 'revising' ? 'Revising script...' : 'Review script'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>
            {script?.title || 'Generating...'}
          </div>
          {phase === 'review' && script?.lines && (
            <div style={{ fontSize: 12, color: '#6d7383', marginTop: 4 }}>
              {lineCount} lines · ~{wordCount.toLocaleString()} words · ~{estMinutes} min
            </div>
          )}
        </div>
        {phase === 'review' && isAudio && (
          <button className="sy-btn-primary" onClick={handleProduce} style={{ padding: '12px 24px', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Sparkle size={14} color="#15181E" /> Produce audio
          </button>
        )}
      </div>

      {/* Loading / generating state */}
      {(phase === 'generating' || phase === 'revising') && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div className="sy-vcard-eq" style={{ justifyContent: 'center', height: 40, marginBottom: 20 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <span key={i} style={{ animationDelay: `${i * 0.12}s`, width: 4, borderRadius: 2 }} />
            ))}
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>
            {phase === 'revising' ? 'Revising your script...' : 'Writing your script...'}
          </div>
          <div style={{ fontSize: 13, color: '#8b91a0' }}>
            Claude is {phase === 'revising' ? 'applying your suggestions' : 'reading your material and crafting the script'}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#2a1a1a', border: '1px solid #C97D7D', borderRadius: 12, padding: 16, color: '#C97D7D', fontSize: 14, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Script review — audio lines */}
      {phase === 'review' && script?.lines && (
        <>
          <div className="sy-script-lines">
            {script.lines.map((line, idx) => {
              const speaker = line.speaker === 'A' ? va : vb;
              const speakerColor = line.speaker === 'A' ? '#D49A5A' : '#6E8BA8';
              return (
                <div key={idx} className="sy-script-line">
                  <button
                    className="sy-script-speaker"
                    style={{ background: speakerColor }}
                    onClick={() => cycleSpeaker(idx)}
                    title="Click to change speaker"
                  >
                    {speaker?.initials || line.speaker}
                  </button>
                  <div className="sy-script-text-wrap">
                    {editingIdx === idx ? (
                      <div>
                        <textarea
                          className="sy-textarea sy-input-dark"
                          value={editText}
                          onChange={e => setEditText(e.target.value)}
                          rows={3}
                          autoFocus
                          style={{ fontSize: 14 }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveLine(idx); }
                            if (e.key === 'Escape') setEditingIdx(null);
                          }}
                        />
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                          <button className="sy-ref-cancel" onClick={() => setEditingIdx(null)}>Cancel</button>
                          <button className="sy-btn-primary" style={{ padding: '5px 14px', fontSize: 12 }} onClick={() => saveLine(idx)}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div className="sy-script-text" onClick={() => editLine(idx)} title="Click to edit">
                        {line.text || <span style={{ color: '#4a5260', fontStyle: 'italic' }}>Empty line — click to edit</span>}
                      </div>
                    )}
                  </div>
                  {editingIdx !== idx && (
                    <div className="sy-script-actions">
                      <button className="sy-script-action" onClick={() => moveLine(idx, -1)} title="Move up" disabled={idx === 0}>↑</button>
                      <button className="sy-script-action" onClick={() => moveLine(idx, 1)} title="Move down" disabled={idx === script.lines!.length - 1}>↓</button>
                      <button className="sy-script-action" onClick={() => editLine(idx)} title="Edit"><Icon name="edit" size={12} /></button>
                      <button className="sy-script-action delete" onClick={() => deleteLine(idx)} title="Delete"><Icon name="close" size={12} /></button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button className="sy-ref-tool" onClick={addLine} style={{ marginTop: 8, marginBottom: 20 }}>
            <Icon name="plus" size={14} /> Add line
          </button>

          {/* Revision bar */}
          <div className="sy-revision-bar">
            <div style={{ fontSize: 12, fontWeight: 600, color: '#8b91a0', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Suggest changes
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea
                className="sy-textarea sy-input-dark"
                value={revisionNote}
                onChange={e => setRevisionNote(e.target.value)}
                placeholder="e.g. Make the opening funnier. Add more examples in section 2. The tone is too formal..."
                rows={2}
                style={{ flex: 1, fontSize: 13 }}
              />
              <button
                className="sy-btn-primary"
                onClick={handleRevise}
                disabled={!revisionNote.trim()}
                style={{ alignSelf: 'flex-end', padding: '10px 18px', fontSize: 13, flexShrink: 0 }}
              >
                Revise
              </button>
            </div>
          </div>
        </>
      )}

      {/* Non-audio outputs — show as text */}
      {phase === 'review' && script?.sections && (
        <div style={{ marginBottom: 30 }}>
          {script.sections.map((s, i) => (
            <div key={i} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#E4E6EA' }}>{s.h}</div>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#aab0bd', fontSize: 14, lineHeight: 1.6 }}>
                {s.items.map((item, j) => <li key={j}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}

      {phase === 'review' && script?.questions && (
        <div style={{ marginBottom: 30 }}>
          {script.questions.map((q, i) => (
            <div key={i} style={{ background: '#1B1F27', border: '1px solid #242932', borderRadius: 12, padding: 16, marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#E4E6EA', marginBottom: 8 }}>Q{i + 1}. {q.q}</div>
              <div style={{ fontSize: 13, color: '#8b91a0', lineHeight: 1.5 }}>{q.a}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
