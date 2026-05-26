'use client';
// Pastoral seal acknowledgement — shown once ever, then never again.
// Single checkbox: confirmed informed consent. No name typing required.

import { useState } from 'react';

export interface VowDialogProps {
  fileId: string;
  suggestedName?: string;
  onCancel: () => void;
  onConfirmed: (consentName: string) => void;
}

export function VowDialog({ fileId, suggestedName, onCancel, onConfirmed }: VowDialogProps) {
  const [consent, setConsent] = useState(false);

  const begin = () => {
    onConfirmed(suggestedName || 'consent');
  };

  return (
    <div className="modal-shroud" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-eyebrow">Pastoral recording</div>
        <h2 className="modal-title">הקלטה</h2>
        <div className="modal-title-en">Before we begin</div>

        <div className="privacy-vow" style={{ marginTop: 16 }}>
          <div className="privacy-vow-title">
            <span className="icon" style={{ width: 12, height: 12 }}>🔒</span> Pastoral Seal
          </div>
          <p>This recording is held in the same confidence as the conversation itself.
          It is stored encrypted, accessible only to you, and never shared without
          your explicit action.</p>
          <span className="heb-quote">לֹא תֵלֵךְ רָכִיל בְּעַמֶּיךָ</span>
        </div>

        <label style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          marginTop: 20, fontSize: 14, color: 'var(--ink-1)', cursor: 'pointer',
          lineHeight: 1.5,
        }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ marginTop: 3, accentColor: 'var(--accent)' }}
          />
          <span>
            I have informed the participant(s) that this conversation is being recorded.
          </span>
        </label>

        <div style={{ display: 'flex', gap: 8, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn primary"
            onClick={begin}
            disabled={!consent}>
            Begin recording
          </button>
        </div>
      </div>
    </div>
  );
}
