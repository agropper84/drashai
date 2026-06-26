'use client';
// Screen 3: Import material — paste text, upload document, audio/video, or add link.
// File uploads go to Google Drive via the materials API.

import { useParams, useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { studyoApi } from '@/app/(studyo)/_lib/studyo-api';

type SourceType = 'paste' | 'upload' | 'av' | 'link';

export default function ImportPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [source, setSource] = useState<SourceType>('paste');
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chips: { type: SourceType; label: string }[] = [
    { type: 'paste', label: 'Paste text' },
    { type: 'upload', label: 'Upload document' },
    { type: 'av', label: 'Audio or video' },
    { type: 'link', label: 'Add a link' },
  ];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, '')); }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, '')); }
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      if (source === 'paste') {
        if (!content.trim()) return;
        await studyoApi.materials.addText(id, content, title.trim() || undefined);
      } else if (source === 'link') {
        if (!content.trim()) return;
        await studyoApi.materials.addLink(id, content.trim(), title.trim() || undefined);
      } else if (file) {
        const type = source === 'av' ? 'media' : 'pdf';
        await studyoApi.materials.addFile(id, file, type, title.trim() || undefined);
      }
      router.push(`/studyo/projects/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = source === 'paste' || source === 'link' ? content.trim().length > 0 : !!file;

  return (
    <div style={{ maxWidth: 780 }}>
      <button
        onClick={() => router.push(`/studyo/projects/${id}`)}
        style={{ fontSize: 13, color: '#8b91a0', cursor: 'pointer', marginBottom: 18, background: 'none', border: 'none', fontFamily: 'inherit', padding: 0 }}
      >
        ← Back to project
      </button>

      <div className="sy-eyebrow" style={{ marginBottom: 8 }}>Reference material</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 24 }}>
        Add reference material
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {chips.map(c => (
          <button
            key={c.type}
            onClick={() => { setSource(c.type); setFile(null); setContent(''); }}
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
            className="sy-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            style={{ marginBottom: 10 }}
          />
          <textarea
            className="sy-textarea"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Paste your chapter, paper, article, or notes here..."
            rows={12}
            style={{ height: 300 }}
          />
        </>
      )}

      {source === 'link' && (
        <>
          <input
            className="sy-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title (optional)"
            style={{ marginBottom: 10 }}
          />
          <input
            className="sy-input"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="https://arxiv.org/abs/1706.03762"
          />
          <div style={{ fontSize: 12, color: '#6d7383', marginTop: 8 }}>
            We'll fetch the page and pull out the readable content.
          </div>
        </>
      )}

      {(source === 'upload' || source === 'av') && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept={source === 'upload' ? '.pdf,.epub,.doc,.docx,.txt' : 'audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov,.webm'}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div
            className="sy-empty-card"
            style={{
              height: 300, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 14,
              borderColor: dragOver ? '#D49A5A' : undefined,
              background: dragOver ? '#221d14' : undefined,
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {file ? (
              <>
                <div style={{ fontSize: 17, fontWeight: 600, color: '#E4E6EA' }}>{file.name}</div>
                <div style={{ fontSize: 13, color: '#8b91a0' }}>
                  {(file.size / 1024 / 1024).toFixed(1)} MB · Click or drop to replace
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, color: '#D49A5A' }}>↑</div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>
                  {source === 'upload' ? 'Drop a PDF, EPUB, or document' : 'Drop an audio or video file'}
                </div>
                <div style={{ fontSize: 13, color: '#8b91a0', maxWidth: 360, lineHeight: 1.5, textAlign: 'center' }}>
                  {source === 'upload'
                    ? "We'll extract the text, keep the chapters, and skip the page furniture. Up to 200 pages."
                    : "A lecture recording, a podcast episode, a YouTube download — we'll transcribe the speech. MP3, WAV, M4A, MP4, or MOV."
                  }
                </div>
                <button
                  style={{
                    marginTop: 8, background: 'transparent', border: '1px solid #2e3540',
                    borderRadius: 10, padding: '9px 18px', color: '#aab0bd',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Choose a file
                </button>
              </>
            )}
          </div>
          {file && (
            <input
              className="sy-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title (optional — defaults to filename)"
              style={{ marginTop: 10 }}
            />
          )}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button
          className="sy-btn-primary"
          onClick={handleAdd}
          disabled={saving || !canSubmit}
          style={{ fontSize: 14, padding: '12px 24px' }}
        >
          {saving ? 'Adding...' : 'Add to project →'}
        </button>
      </div>
    </div>
  );
}
