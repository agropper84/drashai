'use client';
// Recording modal — shows VowDialog once ever, then skips straight to
// recording on all subsequent uses. Consent stored globally in localStorage.

import { useEffect, useRef } from 'react';
import { VowDialog } from '../recording/VowDialog';
import { useRecordingSession } from '../recording/RecordingProvider';
import { useEncounters } from '@/app/_lib/encounters-store';

const CONSENT_KEY = 'drashai.consent-given';

function hasGlobalConsent(): boolean {
  try { return localStorage.getItem(CONSENT_KEY) === '1'; } catch { return false; }
}

function saveGlobalConsent() {
  try { localStorage.setItem(CONSENT_KEY, '1'); } catch {}
}

export function RecordingModal({ onClose, fileId }: { onClose: () => void; fileId?: string }) {
  const rec = useRecordingSession();
  const { encounters } = useEncounters();
  const file = fileId ? encounters.find((e) => e.id === fileId) : undefined;
  const suggestedName = file?.subject || file?.congregantName;
  const autoStarted = useRef(false);

  // If consent was previously given, skip the vow and start immediately.
  useEffect(() => {
    if (!fileId || autoStarted.current || rec.session) return;
    if (hasGlobalConsent()) {
      autoStarted.current = true;
      rec.begin({ fileId, consentName: suggestedName || 'consent' }).then(() => onClose());
    }
  }, [fileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guard: this modal requires a fileId to record into.
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

  // If a recording is already in flight, refuse to start a new one.
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

  // If auto-start is pending (consent exists), show nothing briefly.
  if (hasGlobalConsent()) return null;

  return (
    <VowDialog
      fileId={fileId}
      suggestedName={suggestedName}
      onCancel={onClose}
      onConfirmed={async (consentName) => {
        saveGlobalConsent();
        await rec.begin({ fileId, consentName });
        onClose();
      }}
    />
  );
}
