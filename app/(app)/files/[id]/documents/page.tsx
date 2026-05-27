'use client';
// Documents tab — upload files or import from Google Drive.
// AI extracts text from images (vision), text files, and describes documents.

import { useCallback, useState } from 'react';
import { I } from '@/app/_components/Icons';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { api } from '@/app/_lib/api';
import { useEncounters } from '@/app/_lib/encounters-store';
import type { EncounterDocument } from '@/app/_lib/types';

// Google Picker API loader
let pickerApiLoaded = false;
function loadPickerApi(): Promise<void> {
  if (pickerApiLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject();
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      (window as any).gapi.load('picker', () => {
        pickerApiLoaded = true;
        resolve();
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function DocumentsTab() {
  const { file, patch } = useActiveFile();
  const { refresh } = useEncounters();
  const [extracting, setExtracting] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [importing, setImporting] = useState(false);

  if (!file) return null;

  const docs: EncounterDocument[] = file.documents || [];

  // Legacy document refs from transcript
  const legacyDocs = (file.transcript || '').split('\n')
    .filter(l => l.startsWith('[Document:'))
    .map(l => {
      const match = l.match(/\[Document: (.+?) \((.+?)\) — (.+?)\]/);
      if (!match) return null;
      return { name: match[1], url: match[3], size: match[2], type: '', addedAt: '' } as EncounterDocument;
    })
    .filter(Boolean) as EncounterDocument[];

  const allDocs = [...docs, ...legacyDocs];

  const addDocument = useCallback(async (docUrl: string, docName: string, docSize: number, docType: string) => {
    setExtracting(docName);
    let extractedText = '';
    let isImage = false;
    try {
      const res = await fetch('/api/documents/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: docUrl, name: docName, type: docType }),
      });
      if (res.ok) {
        const result = await res.json();
        extractedText = result.text || '';
        isImage = result.isImage || false;
      }
    } catch {}

    await patch(file.id, {
      addDocument: {
        name: docName,
        url: docUrl,
        size: `${(docSize / 1024).toFixed(1)}KB`,
        type: docType,
        extractedText,
        isImage,
        addedAt: new Date().toISOString(),
      },
    });
    refresh();
    setExtracting(null);
  }, [file.id, patch, refresh]);

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      try {
        const data = await api.uploadDocument(f, file.id);
        await addDocument(data.url, f.name, f.size, f.type);
      } catch (err) {
        console.error('[Documents] upload failed:', err);
        setExtracting(null);
      }
    }
  };

  const handleGoogleDrive = async () => {
    setImporting(true);
    try {
      // Get picker token
      const tokenRes = await fetch('/api/drive/picker-token');
      if (!tokenRes.ok) throw new Error('Not connected to Google');
      const { accessToken, clientId } = await tokenRes.json();

      // Load Picker API
      await loadPickerApi();

      // Open the picker
      const google = (window as any).google;
      const view = new google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .addView(new google.picker.DocsView(google.picker.ViewId.FOLDERS).setSelectFolderEnabled(true))
        .setOAuthToken(accessToken)
        .setDeveloperKey('') // Not needed when using OAuth token
        .setCallback(async (data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            for (const doc of data.docs) {
              try {
                setExtracting(doc.name);
                // Download from Drive → Vercel Blob
                const dlRes = await fetch(`/api/drive/download?fileId=${doc.id}`);
                if (!dlRes.ok) continue;
                const result = await dlRes.json();
                await addDocument(result.url, result.name, result.size, result.type);
              } catch (err) {
                console.error('[Documents] Drive import failed:', err);
                setExtracting(null);
              }
            }
          }
          setImporting(false);
        })
        .setTitle('Import from Google Drive')
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .build();

      picker.setVisible(true);
    } catch (err) {
      console.error('[Documents] Google Drive picker failed:', err);
      setImporting(false);
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
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn small" onClick={handleGoogleDrive} disabled={importing}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}>
              <path d="M12 2L4.5 14h15L12 2z" fill="#4285F4" opacity="0.8"/>
              <path d="M4.5 14l3.5 6h8l3.5-6H4.5z" fill="#34A853" opacity="0.8"/>
              <path d="M15.5 8L12 2l-3.5 6L12 14l3.5-6z" fill="#FBBC05" opacity="0.8"/>
            </svg>
            {importing ? 'Opening...' : 'Google Drive'}
          </button>
          <label className="btn small" style={{ cursor: 'pointer' }}>
            <span className="icon">{I.doc}</span> Upload
            <input type="file" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.heic,.webp"
              style={{ display: 'none' }}
              onChange={e => { handleUpload(e.target.files); e.target.value = ''; }} />
          </label>
        </div>
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
            const isNew = i < docs.length;
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

                {hasImage && doc.url && (
                  <div className="doc-image-preview">
                    <img src={doc.url} alt={doc.name} />
                  </div>
                )}

                {doc.extractedText && !isEditing && (
                  <div className="doc-extracted" data-selectable="true">
                    {doc.extractedText.split('\n').map((line, j) => (
                      line.trim() ? <p key={j}>{line}</p> : <br key={j} />
                    ))}
                  </div>
                )}

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

                {!doc.extractedText && !isEditing && !hasImage && (
                  <div className="doc-no-text">Open to view content</div>
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
