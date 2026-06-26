'use client';
// Screen 2: Project detail — three sections: material, instructions, outputs.
// UI/UX pass: richer material rows (#2), complete inline add incl. audio/video (#1),
// undo-toast on destructive delete (#5), kind-aware output cards (#4),
// neutral "output" labeling (#3/#12), SVG icons (#9), edit affordances (#10), a11y (#11).

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { studyoApi } from '@/app/(studyo)/_lib/studyo-api';
import { getVoice } from '@/app/(studyo)/_lib/studyo-voices';
import { InstructionModal } from '@/app/(studyo)/_components/InstructionModal';
import { Icon, Sparkle } from '@/app/(studyo)/_components/StudyoIcons';
import type { StudyoProject, StudyoInstruction, StudyoMaterial, ProjectMemory } from '@/app/(studyo)/_lib/studyo-types';

const BADGE_COLORS: Record<string, string> = {
  pdf: '#C97D7D', text: '#8FA37C', link: '#6E8BA8', media: '#D49A5A',
};
const BADGE_LABELS: Record<string, string> = {
  pdf: 'PDF', text: 'TXT', link: 'URL', media: 'A/V',
};
const TYPE_ICON: Record<string, string> = {
  pdf: 'pdf', text: 'text', link: 'link', media: 'media',
};
const TYPE_FALLBACK_META: Record<string, string> = {
  pdf: 'Document', text: 'Pasted text', link: 'Web link', media: 'Audio / video',
};

// Output kinds that are listened to (timeline) vs. read (document).
const AUDIO_KINDS = new Set(['audio', 'extract']);
const KIND_ICON: Record<string, string> = {
  audio: 'audio', extract: 'extract', transcript: 'transcript', notes: 'notes', questions: 'questions',
};

// Max ~500KB text per material (Claude context budget).
const MAX_TEXT_BYTES = 500_000;
const MAX_FILE_MB = 50;

const WAVE_PATH = 'M0 15 Q10 5 20 15 T40 15 T60 15 T80 15 T100 15 T120 15 T140 15 T160 15 T180 15 T200 15 T220 15 T242 15';

interface ToastState { msg: string; undo: () => void; }

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<StudyoProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [hoverTitle, setHoverTitle] = useState(false);
  const [hoverDesc, setHoverDesc] = useState(false);
  const [showInstrModal, setShowInstrModal] = useState(false);
  const [editingInstr, setEditingInstr] = useState<StudyoInstruction | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Undo toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Inline material add
  const [addMode, setAddMode] = useState<'none' | 'paste' | 'link'>('none');
  const [addText, setAddText] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [sizeError, setSizeError] = useState('');
  const docInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Memory
  const [addingMemory, setAddingMemory] = useState(false);
  const [memoryDraft, setMemoryDraft] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editingMemoryText, setEditingMemoryText] = useState('');

  useEffect(() => {
    studyoApi.projects.get(id).then(({ project }) => {
      setProject(project);
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [id]);

  const showToast = (msg: string, undo: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, undo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  };
  const runUndo = () => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toast.undo();
    setToast(null);
  };

  if (loading) {
    // Lightweight skeleton instead of bare "Loading..." (#11 polish)
    return (
      <div style={{ opacity: 0.6 }}>
        <div style={{ width: 120, height: 13, background: '#222831', borderRadius: 6, marginBottom: 24 }} />
        <div style={{ display: 'flex', gap: 16, marginBottom: 30 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#222831' }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: 260, height: 24, background: '#222831', borderRadius: 6, marginBottom: 8 }} />
            <div style={{ width: 180, height: 13, background: '#1B1F27', borderRadius: 6 }} />
          </div>
        </div>
        <div style={{ height: 120, background: '#1B1F27', borderRadius: 14 }} />
      </div>
    );
  }
  if (!project) return <div style={{ color: '#8b91a0' }}>Project not found</div>;

  const initial = project.title[0]?.toUpperCase() || 'U';

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

  // --- Soft delete with undo (#5) ---
  const removeMaterial = (mat: StudyoMaterial) => {
    const prev = project.material;
    const updated = prev.filter(m => m.id !== mat.id);
    setProject({ ...project, material: updated });
    studyoApi.projects.update(id, { material: updated }).then(({ project: p }) => setProject(p)).catch(() => {});
    showToast(`Removed “${mat.title}”`, () => {
      studyoApi.projects.update(id, { material: prev }).then(({ project: p }) => setProject(p)).catch(() => {});
    });
  };

  const deleteInstruction = (instr: StudyoInstruction) => {
    const prev = project.instructions;
    const updated = prev.filter(i => i.id !== instr.id);
    setProject({ ...project, instructions: updated });
    studyoApi.projects.update(id, { instructions: updated }).then(({ project: p }) => setProject(p)).catch(() => {});
    showToast(`Deleted instruction “${instr.name}”`, () => {
      studyoApi.projects.update(id, { instructions: prev }).then(({ project: p }) => setProject(p)).catch(() => {});
    });
  };

  // --- Memory ---
  const memories = project.memory || [];

  const addMemory = async () => {
    if (!memoryDraft.trim()) return;
    const mem: ProjectMemory = {
      id: crypto.randomUUID(),
      content: memoryDraft.trim(),
      source: 'user',
      createdAt: new Date().toISOString(),
    };
    const updated = [...memories, mem];
    const { project: p } = await studyoApi.projects.update(id, { memory: updated } as any);
    setProject(p);
    setMemoryDraft('');
    setAddingMemory(false);
  };

  const updateMemory = async (memId: string) => {
    if (!editingMemoryText.trim()) return;
    const updated = memories.map(m => m.id === memId ? { ...m, content: editingMemoryText.trim() } : m);
    const { project: p } = await studyoApi.projects.update(id, { memory: updated } as any);
    setProject(p);
    setEditingMemoryId(null);
  };

  const removeMemory = (mem: ProjectMemory) => {
    const prev = memories;
    const updated = prev.filter(m => m.id !== mem.id);
    setProject({ ...project, memory: updated });
    studyoApi.projects.update(id, { memory: updated } as any).then(({ project: p }) => setProject(p)).catch(() => {});
    showToast('Memory removed', () => {
      studyoApi.projects.update(id, { memory: prev } as any).then(({ project: p }) => setProject(p)).catch(() => {});
    });
  };

  // --- Material add ---
  const handleFileUpload = async (file: File, forcedType?: 'pdf' | 'media') => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setSizeError(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_FILE_MB} MB.`);
      setTimeout(() => setSizeError(''), 4000);
      return;
    }
    setSizeError('');
    setUploading(true);
    try {
      const isMedia = forcedType === 'media' || /\.(mp3|wav|m4a|mp4|mov|webm|ogg)$/i.test(file.name);
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

  const handleDeleteProject = async () => {
    await studyoApi.projects.remove(id);
    router.push('/studyo');
  };

  const toolBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px',
    background: 'transparent', border: '1px solid #2e3540', borderRadius: 9,
    color: '#aab0bd', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  };
  const iconBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, background: 'transparent', border: '1px solid #2e3540',
    borderRadius: 8, color: '#8b91a0', cursor: 'pointer', flexShrink: 0,
  };

  return (
    <>
      <button
        onClick={() => router.push('/studyo')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8b91a0', cursor: 'pointer', marginBottom: 18, background: 'none', border: 'none', fontFamily: 'inherit', padding: 0 }}
      >
        <Icon name="back" size={15} /> Projects
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <div className="sy-project-tile" style={{ width: 52, height: 52, borderRadius: 14, background: project.color, fontSize: 23 }}>{initial}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editingTitle ? (
              <input
                autoFocus value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', background: 'transparent', border: 'none', borderBottom: '2px solid #D49A5A', color: '#E4E6EA', outline: 'none', width: '100%', fontFamily: 'inherit', padding: '0 0 2px' }}
              />
            ) : (
              <div
                onMouseEnter={() => setHoverTitle(true)} onMouseLeave={() => setHoverTitle(false)}
                onClick={() => { setTitleDraft(project.title); setEditingTitle(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', cursor: 'text' }}
                title="Click to edit title"
              >
                <span style={{ borderBottom: hoverTitle ? '1px dashed #4a515e' : '1px dashed transparent' }}>{project.title}</span>
                {hoverTitle && <Icon name="edit" size={14} stroke="#6d7383" />}
              </div>
            )}
            {editingDesc ? (
              <input
                autoFocus value={descDraft}
                onChange={e => setDescDraft(e.target.value)}
                onBlur={saveDesc}
                onKeyDown={e => { if (e.key === 'Enter') saveDesc(); if (e.key === 'Escape') setEditingDesc(false); }}
                placeholder="Add a description..."
                style={{ fontSize: 13.5, color: '#aab0bd', marginTop: 3, background: 'transparent', border: 'none', borderBottom: '1px solid #3a414e', outline: 'none', width: '100%', fontFamily: 'inherit', padding: '0 0 2px' }}
              />
            ) : (
              <div
                onMouseEnter={() => setHoverDesc(true)} onMouseLeave={() => setHoverDesc(false)}
                onClick={() => { setDescDraft(project.desc || ''); setEditingDesc(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: '#8b91a0', marginTop: 3, cursor: 'text' }}
                title="Click to edit description"
              >
                <span>{project.desc || 'Add a description...'}</span>
                {hoverDesc && <Icon name="edit" size={12} stroke="#6d7383" />}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <Link
            href={`/studyo/projects/${id}/configure`}
            style={{ background: '#D49A5A', color: '#15181E', borderRadius: 11, padding: '13px 22px', fontWeight: 700, fontSize: 14.5, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Sparkle size={14} color="#15181E" /> New output
          </Link>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete project"
              style={{ ...iconBtn, width: 42, height: 42, color: '#6d7383' }}
              title="Delete project"
            ><Icon name="trash" size={16} /></button>
          ) : (
            <button
              onClick={handleDeleteProject}
              onBlur={() => setConfirmDelete(false)}
              autoFocus
              style={{ background: '#C97D7D', color: '#15181E', border: 'none', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}
            >Delete project?</button>
          )}
        </div>
      </div>

      {/* Hidden inputs: separate doc vs media so the picker filters correctly (#1) */}
      <input ref={docInputRef} type="file" accept=".pdf,.epub,.doc,.docx,.txt"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'pdf'); e.target.value = ''; }} style={{ display: 'none' }} />
      <input ref={mediaInputRef} type="file" accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov,.webm"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'media'); e.target.value = ''; }} style={{ display: 'none' }} />

      {/* Section A: Reference Material */}
      <div className="sy-section-head">
        <div className="sy-eyebrow">Reference material</div>
        <div style={{ fontSize: 11, color: '#6d7383' }}>{project.material.length} source{project.material.length !== 1 ? 's' : ''}</div>
      </div>

      <div
        className={`sy-ref-panel${dragOver ? ' drag-over' : ''}`}
        style={dragOver ? { borderColor: '#D49A5A', background: '#221d14' } : undefined}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Material rows — type badge + title + meta + open + remove (#2) */}
        {project.material.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {project.material.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid #21262e' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: BADGE_COLORS[m.type] || '#8b91a0', color: '#15181E', fontSize: 10, fontWeight: 700, letterSpacing: '.05em', borderRadius: 6, padding: '4px 8px', flexShrink: 0 }}>
                  <Icon name={TYPE_ICON[m.type] || 'text'} size={12} stroke="#15181E" /> {BADGE_LABELS[m.type] || 'SRC'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                  <div style={{ fontSize: 12, color: '#8b91a0' }}>{m.meta || TYPE_FALLBACK_META[m.type]}</div>
                </div>
                {m.sourceUrl && (
                  <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${m.title}`} title="Open source" style={{ ...iconBtn, textDecoration: 'none' }}>
                    <Icon name="external" size={15} />
                  </a>
                )}
                <button aria-label={`Remove ${m.title}`} title="Remove" onClick={() => removeMaterial(m)} style={iconBtn}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {sizeError && <div style={{ color: '#C97D7D', fontSize: 12, padding: '8px 14px' }}>{sizeError}</div>}

        {/* Add controls */}
        {uploading ? (
          <div className="sy-ref-adding" style={{ padding: '12px 14px', color: '#8b91a0', fontSize: 13 }}>Adding…</div>
        ) : addMode === 'paste' ? (
          <div className="sy-ref-input-area" style={{ padding: 14 }}>
            <input className="sy-input sy-input-dark" value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="Title (optional)" style={{ fontSize: 13 }} />
            <textarea className="sy-textarea sy-input-dark" value={addText} onChange={e => setAddText(e.target.value)} placeholder="Paste your text here…" rows={4} autoFocus style={{ fontSize: 14, marginTop: 6 }} />
            <div className="sy-ref-input-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button className="sy-ref-cancel" style={toolBtn} onClick={() => { setAddMode('none'); setAddText(''); setAddTitle(''); }}>Cancel</button>
              <button className="sy-btn-primary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={handlePasteAdd} disabled={!addText.trim()}>Add</button>
            </div>
          </div>
        ) : addMode === 'link' ? (
          <div className="sy-ref-input-area" style={{ padding: 14 }}>
            <input className="sy-input sy-input-dark" value={addTitle} onChange={e => setAddTitle(e.target.value)} placeholder="Title (optional)" style={{ fontSize: 13 }} />
            <input className="sy-input sy-input-dark" value={addUrl} onChange={e => setAddUrl(e.target.value)} placeholder="https://…" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleLinkAdd(); }} style={{ fontSize: 14, marginTop: 6 }} />
            <div className="sy-ref-input-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button className="sy-ref-cancel" style={toolBtn} onClick={() => { setAddMode('none'); setAddUrl(''); setAddTitle(''); }}>Cancel</button>
              <button className="sy-btn-primary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={handleLinkAdd} disabled={!addUrl.trim()}>Add</button>
            </div>
          </div>
        ) : (
          <div className="sy-ref-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: 12 }}>
            <button style={toolBtn} onClick={() => docInputRef.current?.click()}><Icon name="upload" size={14} /> Upload document</button>
            <button style={toolBtn} onClick={() => mediaInputRef.current?.click()}><Icon name="media" size={14} /> Audio / video</button>
            <button style={toolBtn} onClick={() => setAddMode('paste')}><Icon name="paste" size={14} /> Paste</button>
            <button style={toolBtn} onClick={() => setAddMode('link')}><Icon name="link" size={14} /> Link</button>
            <Link href={`/studyo/projects/${id}/import`} style={{ fontSize: 12, color: '#8b91a0', textDecoration: 'none', marginLeft: 'auto' }}>More options →</Link>
            {project.material.length === 0 && (
              <span style={{ width: '100%', fontSize: 12, color: '#6d7383', marginTop: 2 }}>Drop a file anywhere here, or choose an option above.</span>
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
          <div className="sy-ref-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: 12 }}>
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
                    <button className="sy-instr-pill-edit" aria-label={`Edit ${i.name}`} onClick={() => { setEditingInstr(i); setShowInstrModal(true); }} title="Edit">
                      <Icon name="edit" size={12} />
                    </button>
                    <button className="sy-ref-pill-x" aria-label={`Delete ${i.name}`} onClick={() => deleteInstruction(i)} title="Delete">
                      <Icon name="close" size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="sy-ref-toolbar" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12 }}>
          <button style={toolBtn} onClick={() => { setEditingInstr(null); setShowInstrModal(true); }}>
            <Icon name="plus" size={14} /> New instruction
          </button>
          {project.instructions.length === 0 && (
            <span style={{ fontSize: 12, color: '#6d7383' }}>Format, length, voices, and teaching style</span>
          )}
        </div>
      </div>

      {/* Section C: Outputs (kind-aware) */}
      <div className="sy-section-head">
        <div className="sy-eyebrow">Outputs</div>
        <div style={{ fontSize: 11, color: '#6d7383' }}>{project.outputs.length} item{project.outputs.length !== 1 ? 's' : ''}</div>
      </div>

      {project.outputs.length === 0 ? (
        <Link href={`/studyo/projects/${id}/configure`} className="sy-empty-card" style={{ display: 'block', textDecoration: 'none' }}>
          No outputs yet. Pick an instruction above, or hit <span style={{ color: '#D49A5A' }}>New output</span> to make your first.
        </Link>
      ) : (
        <div className="sy-output-grid">
          {project.outputs.map(o => {
            const isAudio = AUDIO_KINDS.has(o.kind);
            return (
              <div key={o.id} className="sy-output-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div className="sy-output-format" style={{ color: o.color, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                    <Icon name={KIND_ICON[o.kind] || 'audio'} size={14} stroke={o.color} /> {o.format}
                  </div>
                  <div className="sy-output-dur">{o.dur}</div>
                </div>

                {isAudio ? (
                  <>
                    <svg viewBox="0 0 242 30" preserveAspectRatio="none" style={{ width: '100%', height: 30, marginBottom: 14 }}>
                      <path d={WAVE_PATH} stroke={o.color} strokeWidth="2.4" strokeLinecap="round" fill="none" opacity={0.4} />
                    </svg>
                    <div className="sy-output-title">{o.title}</div>
                    <div className="sy-output-progress">
                      <div className="sy-output-progress-fill" style={{ width: `${o.pct}%`, background: o.color }} />
                    </div>
                    <div className="sy-output-status">{o.status}</div>
                  </>
                ) : (
                  // Text outputs are documents, not timelines — no waveform / progress bar (#4)
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 30, marginBottom: 14, color: o.color, opacity: 0.5 }}>
                      <Icon name={KIND_ICON[o.kind] || 'notes'} size={24} stroke={o.color} />
                    </div>
                    <div className="sy-output-title">{o.title}</div>
                    <div className="sy-output-status" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: o.color, display: 'inline-block' }} />
                      {o.status}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Section E: Project Memory */}
      <div className="sy-section-head" style={{ marginTop: 30 }}>
        <div className="sy-eyebrow">Project memory</div>
        <div style={{ fontSize: 11, color: '#6d7383' }}>
          {memories.length} item{memories.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="sy-ref-panel" style={{ marginBottom: 30 }}>
        {memories.length > 0 && (
          <div style={{ padding: 0 }}>
            {memories.map(mem => (
              <div key={mem.id} className="sy-memory-item">
                <div className="sy-memory-badge" style={{ background: mem.source === 'auto' ? '#D49A5A' : '#6E8BA8' }}>
                  {mem.source === 'auto' ? 'AI' : 'You'}
                </div>
                <div className="sy-memory-body">
                  {editingMemoryId === mem.id ? (
                    <div>
                      <textarea
                        className="sy-textarea sy-input-dark"
                        value={editingMemoryText}
                        onChange={e => setEditingMemoryText(e.target.value)}
                        rows={2}
                        autoFocus
                        style={{ fontSize: 13 }}
                      />
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 6 }}>
                        <button className="sy-ref-cancel" onClick={() => setEditingMemoryId(null)}>Cancel</button>
                        <button className="sy-btn-primary" style={{ padding: '5px 12px', fontSize: 11 }} onClick={() => updateMemory(mem.id)}>Save</button>
                      </div>
                    </div>
                  ) : (
                    <div className="sy-memory-text">{mem.content}</div>
                  )}
                  {mem.outputId && (
                    <div className="sy-memory-source">From generated output</div>
                  )}
                </div>
                {editingMemoryId !== mem.id && (
                  <div className="sy-memory-actions">
                    <button
                      className="sy-instr-pill-edit"
                      onClick={() => { setEditingMemoryId(mem.id); setEditingMemoryText(mem.content); }}
                      title="Edit"
                    >
                      <Icon name="edit" size={12} />
                    </button>
                    <button className="sy-ref-pill-x" onClick={() => removeMemory(mem)} title="Remove">×</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {addingMemory ? (
          <div className="sy-ref-input-area">
            <textarea
              className="sy-textarea sy-input-dark"
              value={memoryDraft}
              onChange={e => setMemoryDraft(e.target.value)}
              placeholder="e.g. The student prefers visual analogies. Focus on clinical applications. Avoid heavy math..."
              rows={3}
              autoFocus
              style={{ fontSize: 13 }}
            />
            <div className="sy-ref-input-actions">
              <button className="sy-ref-cancel" onClick={() => { setAddingMemory(false); setMemoryDraft(''); }}>Cancel</button>
              <button className="sy-btn-primary" style={{ padding: '6px 16px', fontSize: 12 }} onClick={addMemory} disabled={!memoryDraft.trim()}>Add</button>
            </div>
          </div>
        ) : (
          <div className="sy-ref-toolbar">
            <button className="sy-ref-tool" onClick={() => setAddingMemory(true)}>
              <Icon name="plus" size={14} /> Add memory
            </button>
            {memories.length === 0 && (
              <span className="sy-ref-hint">Claude learns preferences, style, and context across generations</span>
            )}
          </div>
        )}
      </div>

      {/* Instruction Builder Modal */}
      {showInstrModal && (
        <InstructionModal
          onClose={() => { setShowInstrModal(false); setEditingInstr(null); }}
          onSave={saveInstruction}
          editing={editingInstr}
        />
      )}

      {/* Undo toast (#5) */}
      {toast && (
        <div role="status" aria-live="polite" style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 16, zIndex: 60,
          background: '#222831', border: '1px solid #343b46', borderRadius: 12,
          padding: '12px 16px 12px 18px', boxShadow: '0 12px 30px rgba(0,0,0,.4)',
        }}>
          <span style={{ fontSize: 13.5, color: '#E4E6EA' }}>{toast.msg}</span>
          <button onClick={runUndo} style={{ background: 'none', border: 'none', color: '#D49A5A', fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>Undo</button>
        </div>
      )}
    </>
  );
}
