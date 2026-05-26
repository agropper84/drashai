'use client';
import { I } from '@/app/_components/Icons';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { api } from '@/app/_lib/api';
import { useEncounters } from '@/app/_lib/encounters-store';

export default function DocumentsTab() {
  const { file } = useActiveFile();
  const { refresh } = useEncounters();
  if (!file) return null;

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      try {
        const data = await api.uploadDocument(f, file.id);
        // Store doc reference in encounter transcript
        await api.encounters.patch(file.id, {
          appendTranscript: `[Document: ${f.name} (${(f.size / 1024).toFixed(1)}KB) — ${data.url}]`,
        });
        refresh();
      } catch (err) {
        console.error('[Documents] upload failed:', err);
      }
    }
  };

  // Parse uploaded documents from transcript
  const docRefs = (file.transcript || '').split('\n')
    .filter(l => l.startsWith('[Document:'))
    .map(l => {
      const match = l.match(/\[Document: (.+?) \((.+?)\) — (.+?)\]/);
      return match ? { name: match[1], size: match[2], url: match[3] } : null;
    })
    .filter(Boolean) as { name: string; size: string; url: string }[];

  return (
    <div>
      <div className="section-head">
        <div>
          <h2 className="section-title">מסמכים</h2>
          <div className="section-title-en">Documents</div>
        </div>
        <label className="btn small" style={{ cursor: 'pointer' }}>
          <span className="icon">{I.doc}</span> Upload
          <input type="file" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.heic"
            style={{ display: 'none' }}
            onChange={e => { handleUpload(e.target.files); e.target.value = ''; }} />
        </label>
      </div>

      {/* Uploaded documents list */}
      {docRefs.length > 0 && (
        <div className="doc-list" style={{ marginBottom: 20 }}>
          {docRefs.map((doc, i) => (
            <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="doc-item" style={{ textDecoration: 'none' }}>
              <div className="doc-icon">{doc.name.split('.').pop()?.toUpperCase()}</div>
              <div>
                <div className="doc-name">{doc.name}</div>
                <div className="doc-meta">{doc.size}</div>
              </div>
              <span className="btn ghost small">Open</span>
            </a>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <label className="dropzone" style={{ cursor: 'pointer', display: 'block' }}>
        <span className="icon" style={{ width: 32, height: 32, display: 'block', margin: '0 auto 8px', color: 'var(--ink-3)' }}>{I.doc}</span>
        <p style={{ fontSize: 15 }}>Drop files here or click to upload</p>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>PDFs, photos, notes, condolence letters</p>
        <input type="file" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.heic"
          style={{ display: 'none' }}
          onChange={e => { handleUpload(e.target.files); e.target.value = ''; }} />
      </label>
    </div>
  );
}
