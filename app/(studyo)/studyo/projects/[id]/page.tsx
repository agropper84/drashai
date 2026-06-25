'use client';
// Screen 2: Project detail — three sections: material, instructions, outputs.

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { studyoApi } from '@/app/(studyo)/_lib/studyo-api';
import { getVoice } from '@/app/(studyo)/_lib/studyo-voices';
import type { StudyoProject, StudyoMaterial, StudyoInstruction, StudyoOutput } from '@/app/(studyo)/_lib/studyo-types';

const BADGE_COLORS: Record<string, string> = {
  pdf: '#C97D7D', text: '#8FA37C', link: '#6E8BA8', media: '#D49A5A',
};
const BADGE_LABELS: Record<string, string> = {
  pdf: 'PDF', text: 'TXT', link: 'URL', media: 'A/V',
};
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
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>{project.title}</div>
            <div style={{ fontSize: 13.5, color: '#8b91a0', marginTop: 3 }}>{project.desc || 'No description'}</div>
          </div>
        </div>
        <Link
          href={`/studyo/projects/${id}/configure`}
          style={{ background: '#D49A5A', color: '#15181E', borderRadius: 11, padding: '13px 22px', fontWeight: 700, fontSize: 14.5, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
        >
          ✦ New audio file
        </Link>
      </div>

      {/* Section A: Reference Material */}
      <div className="sy-section-head">
        <div className="sy-eyebrow">Reference material</div>
        <Link href={`/studyo/projects/${id}/import`} className="sy-section-action" style={{ textDecoration: 'none' }}>
          + Add material
        </Link>
      </div>

      {project.material.length === 0 ? (
        <Link href={`/studyo/projects/${id}/import`} className="sy-empty-card" style={{ display: 'block', textDecoration: 'none', marginBottom: 30 }}>
          Drop a PDF, paste text, or add a link to build this project's library.
        </Link>
      ) : (
        <div className="sy-material-list" style={{ marginBottom: 30 }}>
          {project.material.map(m => (
            <div key={m.id} className="sy-material-row">
              <div className="sy-material-badge" style={{ background: BADGE_COLORS[m.type] || '#8b91a0' }}>
                {BADGE_LABELS[m.type] || m.type.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sy-material-title">{m.title}</div>
                <div className="sy-material-meta">{m.meta}</div>
              </div>
              <button className="sy-material-remove" onClick={() => removeMaterial(m.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Section B: Output Instructions */}
      <div className="sy-section-head">
        <div className="sy-eyebrow">Output instructions</div>
        <button className="sy-section-action">+ Create instruction</button>
      </div>

      {project.instructions.length === 0 ? (
        <div className="sy-empty-card" style={{ marginBottom: 30 }}>
          Save a reusable recipe — format, length, voices, and how you want it taught.
        </div>
      ) : (
        <div className="sy-instr-grid" style={{ marginBottom: 30 }}>
          {project.instructions.map(i => {
            const va = getVoice(i.voiceA);
            const vb = i.voiceB ? getVoice(i.voiceB) : null;
            const voiceLabel = vb ? `${va?.name} & ${vb.name}` : va?.name || 'Unknown';
            return (
              <div key={i.id} className="sy-instr-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="sy-instr-name">{i.name}</div>
                  <span className="sy-instr-badge">{i.format}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                  <div className="sy-avatar-stack" style={{ paddingLeft: 2 }}>
                    {va && <div className="sy-avatar-stack-item" style={{ background: va.color, marginLeft: 0 }}>{va.initials}</div>}
                    {vb && <div className="sy-avatar-stack-item" style={{ background: vb.color }}>{vb.initials}</div>}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#8b91a0' }}>{voiceLabel} · {LENGTH_LABELS[i.length] || i.length}</div>
                </div>
                <div className="sy-instr-note">{i.note || 'No custom instructions'}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <button className="sy-instr-use">Use →</button>
                  <button className="sy-instr-edit">Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </>
  );
}
