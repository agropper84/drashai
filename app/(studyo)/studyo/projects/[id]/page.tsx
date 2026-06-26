'use client';
// Screen 2: Project detail — three sections: material, instructions, outputs.

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { studyoApi } from '@/app/(studyo)/_lib/studyo-api';
import { getVoice } from '@/app/(studyo)/_lib/studyo-voices';
import { InstructionModal } from '@/app/(studyo)/_components/InstructionModal';
import type { StudyoProject, StudyoMaterial, StudyoInstruction, StudyoOutput } from '@/app/(studyo)/_lib/studyo-types';

const BADGE_COLORS: Record<string, string> = {
  pdf: '#C97D7D', text: '#8FA37C', link: '#6E8BA8', media: '#D49A5A',
};
const BADGE_LABELS: Record<string, string> = {
  pdf: 'PDF', text: 'TXT', link: 'URL', media: 'A/V',
};
const BADGE_ICONS: Record<string, string> = {
  pdf: '📄', text: '✎', link: '🔗', media: '🎙',
};

// Max ~500KB text per material (Claude Opus context is ~200K tokens ≈ 680KB)
const MAX_TEXT_BYTES = 500_000;
const MAX_FILE_MB = 50;
const LENGTH_LABELS: Record<string, string> = {
  quick: '~5 min', standard: '~15 min', deep: '~30 min+',
};

// Placeholder waveform SVG path
const WAVE_PATH = 'M0 15 Q10 5 20 15 T40 15 T60 15 T80 15 T100 15 T120 15 T140 15 T160 15 T180 15 T200 15 T220 15 T242 15';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<StudyoProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [showInstrModal, setShowInstrModal] = useState(false);
  const [editingInstr, setEditingInstr] = useState<StudyoInstruction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Inline material add
  const [addMode, setAddMode] = useState<'none' | 'paste' | 'link'>('none');
  const [addText, setAddText] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [sizeError, setSizeError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    studyoApi.projects.get(id).then(({ project }) => {
      setProject(project);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ color: '#8b91a0' }}>Loading...</div>;
  if (!project) return <div style={{ color: '#8b91a0' }}>Project not found</div>;

  const initial = project.title[0]?.toUpperCase() || 'U';

  const removeMaterial = async (matId: string) => {
    const updated = project.material.filter(m => m.id !== matId);
    const { project: p } = await studyoApi.projects.update(id, { material: updated });
    setProject(p);
  };

  const saveTitle = async () => {
    if (!titleDraft.trim() || titleDraft.trim() === project.title) { setEditingTitle(false); return; }
    const { project: p } = await studyoApi.projects.update(id, { title: titleDraft.trim() });
    setProject(p);
    setEditingTitle(false);
  };

  const saveDesc = async () => {
    if (descDraft.trim() === (project.desc || '')) { setEditingDesc(false); return; }
    const { project: p } = await studyoApi.projects.update(id, { desc: descDraft.trim() });
    setProject(p);
    setEditingDesc(false);
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setSizeError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_FILE_MB} MB.`);
      setTimeout(() => setSizeError(''), 4000);
      return;
    }
    setSizeError('');
    setUploading(true);
    try {
      const isMedia = /\.(mp3|wav|m4a|mp4|mov|webm|ogg)$/i.test(file.name);
      const { project: p } = await studyoApi.materials.addFile(id, file, isMedia ? 'media' : 'pdf');
      setProject(p);
    } catch { /* silent */ }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileUpload(f);
  };

  const handlePasteAdd = async () => {
    if (!addText.trim()) return;
    if (new Blob([addText]).size > MAX_TEXT_BYTES) {
      setSizeError(`Text too long (${(new Blob([addText]).size / 1024).toFixed(0)} KB). Maximum is ${MAX_TEXT_BYTES / 1000} KB per source. Split into multiple materials.`);
      setTimeout(() => setSizeError(''), 4000);
      return;
    }
    setSizeError('');
    setUploading(true);
    try {
      const { project: p } = await studyoApi.materials.addText(id, addText, addTitle.trim() || undefined);
      setProject(p);
      setAddText(''); setAddTitle(''); setAddMode('none');
    } catch { /* silent */ }
    setUploading(false);
  };

  const handleLinkAdd = async () => {
    if (!addUrl.trim()) return;
    setUploading(true);
    try {
      const { project: p } = await studyoApi.materials.addLink(id, addUrl.trim(), addTitle.trim() || undefined);
      setProject(p);
      setAddUrl(''); setAddTitle(''); setAddMode('none');
    } catch { /* silent */ }
    setUploading(false);
  };

  const saveInstruction = async (instr: StudyoInstruction) => {
    const existing = project.instructions.findIndex(i => i.id === instr.id);
    const updated = existing >= 0
      ? project.instructions.map((i, idx) => idx === existing ? instr : i)
      : [...project.instructions, instr];
    const { project: p } = await studyoApi.projects.update(id, { instructions: updated });
    setProject(p);
    setShowInstrModal(false);
    setEditingInstr(null);
  };

  const deleteInstruction = async (instrId: string) => {
    const updated = project.instructions.filter(i => i.id !== instrId);
    const { project: p } = await studyoApi.projects.update(id, { instructions: updated });
    setProject(p);
  };

  const handleDeleteProject = async () => {
    await studyoApi.projects.remove(id);
    router.push('/studyo');
  };

  return (
    <>
      <button
        onClick={() => router.push('/studyo')}
        style={{ fontSize: 13, color: '#8b91a0', cursor: 'pointer', marginBottom: 18, background: 'none', border: 'none', fontFamily: 'inherit', padding: 0 }}
      >
        ← Projects
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <div className="sy-project-tile" style={{ width: 52, height: 52, borderRadius: 14, background: project.color, fontSize: 23 }}>{initial}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editingTitle ? (
              <input
                autoFocus
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                style={{
                  fontSize: 26, fontWeight: 700, letterSpacing: '-.02em',
                  background: 'transparent', border: 'none', borderBottom: '2px solid #D49A5A',
                  color: '#E4E6EA', outline: 'none', width: '100%', fontFamily: 'inherit',
                  padding: '0 0 2px',
                }}
              />
            ) : (
              <div
                onClick={() => { setTitleDraft(project.title); setEditingTitle(true); }}
                style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', cursor: 'text' }}
                title="Click to edit title"
              >
                {project.title}
              </div>
            )}
            {editingDesc ? (
              <input
                autoFocus
                value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                onBlur={saveDesc}
                onKeyDown={e => { if (e.key === 'Enter') saveDesc(); if (e.key === 'Escape') setEditingDesc(false); }}
                placeholder="Add a description..."
                style={{
                  fontSize: 13.5, color: '#aab0bd', marginTop: 3,
                  background: 'transparent', border: 'none', borderBottom: '1px solid #3a414e',
                  outline: 'none', width: '100%', fontFamily: 'inherit', padding: '0 0 2px',
                }}
              />
            ) : (
              <div
                onClick={() => { setDescDraft(project.desc || ''); setEditingDesc(true); }}
                style={{ fontSize: 13.5, color: '#8b91a0', marginTop: 3, cursor: 'text' }}
                title="Click to edit description"
              >
                {project.desc || 'Add a description...'}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <Link
            href={`/studyo/projects/${id}/configure`}
            style={{ background: '#D49A5A', color: '#15181E', borderRadius: 11, padding: '13px 22px', fontWeight: 700, fontSize: 14.5, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            ✦ New audio file
          </Link>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ background: 'none', border: '1px solid #2e3540', borderRadius: 10, padding: '12px', cursor: 'pointer', color: '#6d7383', fontSize: 14 }}
              title="Delete project"
            >✕</button>
          ) : (
            <button
              onClick={handleDeleteProject}
              style={{ background: '#C97D7D', color: '#15181E', border: 'none', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}
            >Delete project</button>
          )}
        </div>
      </div>

      {/* Section A: Reference Material */}
      <div className="sy-section-head">
        <div className="sy-eyebrow">Reference material</div>
        <div style={{ fontSize: 11, color: '#6d7383' }}>{project.material.length} source{project.material.length !== 1 ? 's' : ''}</div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.epub,.doc,.docx,.txt,audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov,.webm"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }}
        style={{ display: 'none' }}
      />

      <div
        className={`sy-ref-panel${dragOver ? ' drag-over' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Material pills */}
        {project.material.length > 0 && (
          <div className="sy-ref-pills">
            {project.material.map(m => (
              <div key={m.id} className="sy-ref-pill">
                <span className="sy-ref-pill-dot" style={{ background: BADGE_COLORS[m.type] || '#8b91a0' }} />
                <span className="sy-ref-pill-name">{m.title}</span>
                <button className="sy-ref-pill-x" onClick={() => removeMaterial(m.id)} title="Remove">×</button>
              </div>
            ))}
          </div>
        )}

        {sizeError && (
          <div style={{ color: '#C97D7D', fontSize: 12, padding: '6px 14px' }}>{sizeError}</div>
        )}

        {/* Add controls */}
        {uploading ? (
          <div className="sy-ref-adding">Adding...</div>
        ) : addMode === 'paste' ? (
          <div className="sy-ref-input-area">
            <input className="sy-input sy-input-dark" value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="Title (optional)" style={{ fontSize: 13 }} />
            <textarea className="sy-textarea sy-input-dark" value={addText} onChange={e => setAddText(e.target.value)} placeholder="Paste your text here..." rows={4} autoFocus style={{ fontSize: 14, marginTop: 6 }} />
            <div className="sy-ref-input-actions">
              <button className="sy-ref-cancel" onClick={() => { setAddMode('none'); setAddText(''); setAddTitle(''); }}>Cancel</button>
              <button className="sy-btn-primary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={handlePasteAdd} disabled={!addText.trim()}>Add</button>
            </div>
          </div>
        ) : addMode === 'link' ? (
          <div className="sy-ref-input-area">
            <input className="sy-input sy-input-dark" value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="Title (optional)" style={{ fontSize: 13 }} />
            <input className="sy-input sy-input-dark" value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="https://..." autoFocus onKeyDown={e => { if (e.key === 'Enter') handleLinkAdd(); }} style={{ fontSize: 14, marginTop: 6 }} />
            <div className="sy-ref-input-actions">
              <button className="sy-ref-cancel" onClick={() => { setAddMode('none'); setAddUrl(''); setAddTitle(''); }}>Cancel</button>
              <button className="sy-btn-primary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={handleLinkAdd} disabled={!addUrl.trim()}>Add</button>
            </div>
          </div>
        ) : (
          <div className="sy-ref-toolbar">
            <button className="sy-ref-tool" onClick={() => fileInputRef.current?.click()}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Upload
            </button>
            <button className="sy-ref-tool" onClick={() => setAddMode('paste')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
              Paste
            </button>
            <button className="sy-ref-tool" onClick={() => setAddMode('link')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              Link
            </button>
            {project.material.length === 0 && (
              <span className="sy-ref-hint">Drop files here or choose an option</span>
            )}
          </div>
        )}
      </div>
      <div style={{ marginBottom: 30 }} />

      {/* Section B: Output Instructions */}
      <div className="sy-section-head">
        <div className="sy-eyebrow">Output instructions</div>
        <div style={{ fontSize: 11, color: '#6d7383' }}>{project.instructions.length} recipe{project.instructions.length !== 1 ? 's' : ''}</div>
      </div>

      <div className="sy-ref-panel" style={{ marginBottom: 30 }}>
        {project.instructions.length > 0 && (
          <div className="sy-ref-pills">
            {project.instructions.map(i => {
              const va = getVoice(i.voiceA);
              const vb = i.voiceB ? getVoice(i.voiceB) : null;
              return (
                <div key={i.id} className="sy-instr-pill">
                  <div className="sy-instr-pill-avatars">
                    {va && <div className="sy-instr-pill-av" style={{ background: va.color }}>{va.initials}</div>}
                    {vb && <div className="sy-instr-pill-av sy-instr-pill-av2" style={{ background: vb.color }}>{vb.initials}</div>}
                  </div>
                  <div className="sy-instr-pill-info">
                    <span className="sy-instr-pill-name">{i.name}</span>
                    <span className="sy-instr-pill-tag">{i.format}</span>
                  </div>
                  <div className="sy-instr-pill-actions">
                    <Link href={`/studyo/projects/${id}/configure?instr=${i.id}`} className="sy-instr-pill-use" title="Use this instruction">Use</Link>
                    <button className="sy-instr-pill-edit" onClick={() => { setEditingInstr(i); setShowInstrModal(true); }} title="Edit">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="sy-ref-pill-x" onClick={() => deleteInstruction(i.id)} title="Delete">×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="sy-ref-toolbar">
          <button className="sy-ref-tool" onClick={() => { setEditingInstr(null); setShowInstrModal(true); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New instruction
          </button>
          {project.instructions.length === 0 && (
            <span className="sy-ref-hint">Format, length, voices, and teaching style</span>
          )}
        </div>
      </div>

      {/* Section C: Audio Files (Outputs) */}
      <div className="sy-section-head">
        <div className="sy-eyebrow">Audio files</div>
      </div>

      {project.outputs.length === 0 ? (
        <Link href={`/studyo/projects/${id}/configure`} className="sy-empty-card" style={{ display: 'block', textDecoration: 'none' }}>
          No audio files yet. Pick an instruction above, or hit <span style={{ color: '#D49A5A' }}>New audio file</span> to make your first.
        </Link>
      ) : (
        <div className="sy-output-grid">
          {project.outputs.map(o => (
            <div key={o.id} className="sy-output-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="sy-output-format" style={{ color: o.color }}>{o.format}</div>
                <div className="sy-output-dur">{o.dur}</div>
              </div>
              <svg viewBox="0 0 242 30" preserveAspectRatio="none" style={{ width: '100%', height: 30, marginBottom: 14 }}>
                <path d={WAVE_PATH} stroke={o.color} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity={0.4} />
              </svg>
              <div className="sy-output-title">{o.title}</div>
              <div className="sy-output-progress">
                <div className="sy-output-progress-fill" style={{ width: `${o.pct}%`, background: o.color }} />
              </div>
              <div className="sy-output-status">{o.status}</div>
            </div>
          ))}
        </div>
      )}

      {/* Instruction Builder Modal */}
      {showInstrModal && (
        <InstructionModal
          onClose={() => { setShowInstrModal(false); setEditingInstr(null); }}
          onSave={saveInstruction}
          editing={editingInstr}
        />
      )}
    </>
  );
}
