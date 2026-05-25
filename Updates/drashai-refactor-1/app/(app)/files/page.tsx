'use client';
// Home — file list. Becomes ~80 lines after extracting FileCard.
// Plan 2 redesigns the card content; Plan 3 makes delete safe.

import { I } from '@/app/_components/Icons';
import { FileCard } from '@/app/_components/files/FileCard';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useModal } from '@/app/_components/modals/ModalProvider';

export default function FilesPage() {
  const { encounters, loading } = useEncounters();
  const { open } = useModal();

  if (loading) {
    return <div className="mono" style={{ color: 'var(--ink-3)' }}>Loading...</div>;
  }

  return (
    <>
      <div className="page-head">
        <div className="page-title-wrap">
          <div className="page-eyebrow">Your encounters</div>
          <h1 className="page-title heb-display">תיקים</h1>
          <div className="page-title-en">Files</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={() => open('record')}>
            <span className="icon">{I.mic}</span> Quick Record
          </button>
          <button className="btn primary" onClick={() => open('new')}>
            <span className="icon">{I.plus}</span> New File
          </button>
        </div>
      </div>

      {encounters.length === 0 ? (
        <div className="empty-state">
          <div className="heb-display" style={{ fontSize: 48, marginBottom: 12, opacity: 0.2 }}>דרשאי</div>
          <p style={{ fontSize: 18 }}>No encounters yet</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>Create your first file to begin</p>
          <button className="btn primary" style={{ marginTop: 20 }} onClick={() => open('new')}>
            <span className="icon">{I.plus}</span> New File
          </button>
        </div>
      ) : (
        <div className="file-grid">
          {encounters.map((enc) => <FileCard key={enc.id} encounter={enc} />)}
        </div>
      )}
    </>
  );
}
