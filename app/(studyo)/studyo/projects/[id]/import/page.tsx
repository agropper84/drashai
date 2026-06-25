'use client';
// Screen 3: Import material — placeholder for Phase 2 build.

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { studyoApi } from '@/app/(studyo)/_lib/studyo-api';
import type { StudyoMaterial } from '@/app/(studyo)/_lib/studyo-types';

type SourceType = 'paste' | 'upload' | 'av' | 'link';

export default function ImportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [source, setSource] = useState<SourceType>('paste');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const chips: { type: SourceType; label: string }[] = [
    { type: 'paste', label: 'Paste text' },
    { type: 'upload', label: 'Upload document' },
    { type: 'av', label: 'Audio or video' },
    { type: 'link', label: 'Add a link' },
  ];

  const handleAdd = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const { project } = await studyoApi.projects.get(id);
      const material: StudyoMaterial = {
        id: crypto.randomUUID(),
        type: source === 'paste' ? 'text' : source === 'link' ? 'link' : source === 'av' ? 'media' : 'pdf',
        title: title.trim() || (source === 'paste' ? 'Pasted text' : source === 'link' ? content.trim() : 'Uploaded file'),
        meta: source === 'paste' ? `Pasted · ${content.split(/\s+/).length.toLocaleString()} words` : source === 'link' ? content.trim() : 'Just added',
        extractedText: source === 'paste' ? content : undefined,
        sourceUrl: source === 'link' ? content.trim() : undefined,
      };
      await studyoApi.projects.update(id, {
        material: [...project.material, material],
      });
      router.push(`/studyo/projects/${id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 780 }}>
      <div className="sy-eyebrow" style={{ marginBottom: 8 }}>Reference material</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 24 }}>
        Add reference material
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {chips.map(c => (
          <button
            key={c.type}
            onClick={() => setSource(c.type)}
            style={{
              padding: '11px 18px', borderRadius: 11, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', border: '1px solid',
              borderColor: source === c.type ? '#D49A5A' : '#262C36',
              background: source === c.type ? '#221d14' : '#1B1F27',
              color: source === c.type ? '#D49A5A' : '#aab0bd',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {source === 'paste' && (
        <>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            style={{
              width: '100%', background: '#1B1F27', border: '1px solid #262C36',
              borderRadius: 10, padding: '12px 16px', color: '#E4E6EA',
              fontSize: 14, outline: 'none', fontFamily: 'inherit', marginBottom: 10,
            }}
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste your chapter, paper, article, or notes here..."
            style={{
              width: '100%', height: 300, resize: 'none',
              background: '#1B1F27', border: '1px solid #262C36',
              borderRadius: 14, padding: 20, color: '#E4E6EA',
              fontSize: 15.5, lineHeight: 1.6, outline: 'none', fontFamily: 'inherit',
            }}
          />
        </>
      )}

      {source === 'link' && (
        <input
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="https://arxiv.org/abs/1706.03762"
          style={{
            width: '100%', background: '#1B1F27', border: '1px solid #262C36',
            borderRadius: 10, padding: '14px 16px', color: '#E4E6EA',
            fontSize: 15, outline: 'none', fontFamily: 'inherit',
          }}
        />
      )}

      {(source === 'upload' || source === 'av') && (
        <div className="sy-empty-card" style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <div style={{ fontSize: 40, color: '#D49A5A' }}>↑</div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>
            {source === 'upload' ? 'Drop a PDF, EPUB, or document' : 'Drop an audio or video file'}
          </div>
          <div style={{ fontSize: 13, color: '#8b91a0', maxWidth: 360, lineHeight: 1.5 }}>
            {source === 'upload'
              ? "We'll extract the text, keep the chapters, and skip the page furniture."
              : "We'll transcribe the speech and use it as your source."
            }
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button
          onClick={handleAdd}
          disabled={saving || !content.trim()}
          style={{
            background: '#D49A5A', color: '#15181E', borderRadius: 11,
            padding: '12px 24px', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', border: 'none', fontFamily: 'inherit',
            opacity: saving || !content.trim() ? 0.5 : 1,
          }}
        >
          {saving ? 'Adding...' : 'Add to project →'}
        </button>
      </div>
    </div>
  );
}
