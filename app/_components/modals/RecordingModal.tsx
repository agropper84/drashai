'use client';
// Plan 9 — Modal is now the vow phase only. Once consent is granted, the
// modal closes and the global RecordingBar takes over.

import { VowDialog } from '../recording/VowDialog';
import { useRecordingSession } from '../recording/RecordingProvider';
import { useEncounters } from '@/app/_lib/encounters-store';

export function RecordingModal({ onClose, fileId }: { onClose: () => void; fileId?: string }) {
  const rec = useRecordingSession();
  const { encounters } = useEncounters();
  const file = fileId ? encounters.find((e) => e.id === fileId) : undefined;
  const suggestedName = file?.subject || file?.congregantName;

  // Guard: this modal requires a fileId to record into. (Quick Record may
  // call this without one; in that case, prompt to choose or create a file.)
  if (!fileId) {
    return (
      <div className="modal-shroud" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-eyebrow">Quick record</div>
          <h2 className="modal-title">הקלטה</h2>
          <div className="modal-title-en">Choose a file first</div>
          <p style={{ marginTop: 16, fontFamily: 'Cormorant Garamond, serif', color: 'var(--ink-2)' }}>
            Recording needs a file to attach to. Open or create a file, then press Record there.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn primary" onClick={onClose}>OK</button>
          </div>
        </div>
      </div>
    );
  }

  // If a recording is already in flight for any file, refuse to start a new one.
  if (rec.session) {
    return (
      <div className="modal-shroud" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-eyebrow">Already recording</div>
          <h2 className="modal-title">הקלטה</h2>
          <div className="modal-title-en">One recording at a time</div>
          <p style={{ marginTop: 16, fontFamily: 'Cormorant Garamond, serif', color: 'var(--ink-2)' }}>
            A recording is already in progress. Save it from the bar before starting another.
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn primary" onClick={onClose}>OK</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VowDialog
      fileId={fileId}
      suggestedName={suggestedName}
      onCancel={onClose}
      onConfirmed={async (consentName) => {
        const ok = await rec.begin({ fileId, consentName });
        // Modal closes either way; if mic init failed the bar simply won't appear.
        onClose();
      }}
    />
  );
}
