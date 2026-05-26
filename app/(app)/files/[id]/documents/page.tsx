'use client';
// Documents tab — upload files, AI extracts text content.
// Images: kept as images + AI description/OCR.
// PDFs/text: converted to editable text.

import { useState } from 'react';
import { I } from '@/app/_components/Icons';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { api } from '@/app/_lib/api';
import { useEncounters } from '@/app/_lib/encounters-store';
import type { EncounterDocument } from '@/app/_lib/types';

export default function DocumentsTab() {
  const { file, patch } = useActiveFile();
  const { refresh } = useEncounters();
  const [extracting, setExtracting] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  if (!file) return null;

  const docs: EncounterDocument[] = file.documents || [];

  // Also parse legacy document refs from transcript for backward compatibility
  const legacyDocs = (file.transcript || '').split('\n')
    .filter(l => l.startsWith('[Document:'))
    .map(l => {
      const match = l.match(/\[Document: (.+?) \((.+?)\) — (.+?)\]/);
      if (!match) return null;
      return { name: match[1], url: match[3], size: match[2], type: '', addedAt: '' } as EncounterDocument;
    })
    .filter(Boolean) as EncounterDocument[];

  const allDocs = [...docs, ...legacyDocs];

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      try {
        setExtracting(f.name);
        // Upload file
        const data = await api.uploadDocument(f, file.id);

        // Extract text via AI
        let extractedText = '';
        let isImage = false;
        try {
          const res = await fetch('/api/documents/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: data.url, name: f.name, type: f.type }),
          });
          if (res.ok) {
            const result = await res.json();
            extractedText = result.text || '';
            isImage = result.isImage || false;
          }
        } catch {}

        // Store as proper document
        await patch(file.id, {
          addDocument: {
            name: f.name,
            url: data.url,
            size: `${(f.size / 1024).toFixed(1)}KB`,
            type: f.type,
            extractedText,
            isImage,
            addedAt: new Date().toISOString(),
          },
        });
        refresh();
      } catch (err) {
        console.error('[Documents] upload failed:', err);
      } finally {
        setExtracting(null);
      }
    }
  };

  const handleSaveEdit = async (idx: number) => {
    await patch(file.id, { updateDocument: { index: idx, extractedText: editText } });
    refresh();
    setEditingIdx(null);
  };

  const handleDelete = async (idx: number) => {
    await patch(file.id, { removeDocument: idx });
    refresh();
  };

  const ext = (name: string) => name.split('.').pop()?.toUpperCase() || '?';
  const isImgExt = (name: string) => /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(name);

  return (
    <div>
      <div className="section-head">
        <div>
          <h2 className="section-title">מסמכים</h2>
          <div className="section-title-en">Documents</div>
        </div>
        <label className="btn small" style={{ cursor: 'pointer' }}>
          <span className="icon">{I.doc}</span> Upload
          <input type="file" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.heic,.webp"
            style={{ display: 'none' }}
            onChange={e => { handleUpload(e.target.files); e.target.value = ''; }} />
        </label>
      </div>

      {extracting && (
        <div className="doc-extracting">
          <span className="doc-extracting-dots"><span/><span/><span/></span>
          Extracting text from {extracting}…
        </div>
      )}

      {allDocs.length > 0 && (
        <div className="doc-list" style={{ marginBottom: 20 }}>
          {allDocs.map((doc, i) => {
            const isNew = i < docs.length; // true = new format, false = legacy
            const realIdx = isNew ? i : -1;
            const isEditing = editingIdx === realIdx;
            const hasImage = doc.isImage || isImgExt(doc.name);

            return (
              <div key={i} className="doc-card">
                <div className="doc-card-head">
                  <div className="doc-icon">{ext(doc.name)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="doc-name">{doc.name}</div>
                    <div className="doc-meta">
                      {doc.size}
                      {doc.addedAt && ` · ${new Date(doc.addedAt).toLocaleDateString()}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="btn ghost small">Open</a>
                    {isNew && (
                      <>
                        <button
                          className="btn ghost small"
                          onClick={() => {
                            if (isEditing) setEditingIdx(null);
                            else { setEditingIdx(realIdx); setEditText(doc.extractedText || ''); }
                          }}>
                          {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                        <button className="btn ghost small" style={{ color: 'var(--accent)' }} onClick={() => handleDelete(realIdx)}>
                          <span className="icon" style={{ width: 12, height: 12 }}>{I.trash}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Image preview */}
                {hasImage && doc.url && (
                  <div className="doc-image-preview">
                    <img src={doc.url} alt={doc.name} />
                  </div>
                )}

                {/* Extracted text */}
                {doc.extractedText && !isEditing && (
                  <div className="doc-extracted" data-selectable="true">
                    {doc.extractedText.split('\n').map((line, j) => (
                      line.trim() ? <p key={j}>{line}</p> : <br key={j} />
                    ))}
                  </div>
                )}

                {/* Edit mode */}
                {isEditing && (
                  <div className="doc-edit">
                    <textarea
                      className="input serif"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={8}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                      <button className="btn ghost small" onClick={() => setEditingIdx(null)}>Cancel</button>
                      <button className="btn primary small" onClick={() => handleSaveEdit(realIdx)}>Save</button>
                    </div>
                  </div>
                )}

                {/* No text extracted yet (legacy doc) */}
                {!doc.extractedText && !isEditing && !hasImage && (
                  <div className="doc-no-text">
                    Open to view content
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Drop zone */}
      <label className="dropzone" style={{ cursor: 'pointer', display: 'block' }}>
        <span className="icon" style={{ width: 32, height: 32, display: 'block', margin: '0 auto 8px', color: 'var(--ink-3)' }}>{I.doc}</span>
        <p style={{ fontSize: 15 }}>Drop files here or click to upload</p>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
          PDFs, photos, notes — AI will extract text automatically
        </p>
        <input type="file" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.heic,.webp"
          style={{ display: 'none' }}
          onChange={e => { handleUpload(e.target.files); e.target.value = ''; }} />
      </label>
    </div>
  );
}
