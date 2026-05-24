'use client';
import { I } from '@/app/_components/Icons';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { api } from '@/app/_lib/api';
import { useEncounters } from '@/app/_lib/encounters-store';

export default function DocumentsTab() {
  const { file } = useActiveFile();
  const { refresh } = useEncounters();
  if (!file) return null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await api.uploadDocument(f, file.id);
      refresh();
    } catch (err) {
      console.error('[Documents] upload failed:', err);
    }
    e.target.value = '';
  };

  return (
    <div>
      <div className="section-head">
        <div>
          <h2 className="section-title">מסמכים</h2>
          <div className="section-title-en">Documents</div>
        </div>
        <label className="btn small" style={{ cursor: 'pointer' }}>
          <span className="icon">{I.doc}</span> Upload
          <input
            type="file"
            accept=".pdf,.doc,.docx,.txt,image/*"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
        </label>
      </div>

      <div className="empty-state" style={{ paddingTop: 30 }}>
        <p style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>
          Documents UI follows the old page.tsx body. If you had a custom list, lift it here verbatim.
        </p>
      </div>
    </div>
  );
}
