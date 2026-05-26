'use client';
// Pastoral seal acknowledgement. Three gates:
// 1. Checkbox: informed consent given
// 2. Type the family name (matches /^.{2,}$/ — any non-empty name)
// 3. Click "Begin"
//
// The typed name is stored on the encounter as consentName for audit.

import { useState } from 'react';
import { useEncounters } from '@/app/_lib/encounters-store';

export interface VowDialogProps {
  fileId: string;
  suggestedName?: string;
  onCancel: () => void;
  onConfirmed: (consentName: string) => void;
}

export function VowDialog({ fileId, suggestedName, onCancel, onConfirmed }: VowDialogProps) {
  const [consent, setConsent] = useState(false);
  const [typedName, setTypedName] = useState('');
  const { patch } = useEncounters();

  const nameMatches = typedName.trim().length >= 2;
  const canBegin = consent && nameMatches;

  const begin = async () => {
    const name = typedName.trim();
    // Store the audit field on the encounter — non-blocking; recording starts even if this fails.
    patch(fileId, { consentName: name, consentAt: new Date().toISOString() }).catch(() => {});
    onConfirmed(name);
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

        <div style={{ marginTop: 16 }}>
          <label style={{
            display: 'block', fontSize: 13, color: 'var(--ink-2)',
            marginBottom: 6, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic',
          }}>
            Type the family or person's name to confirm:
          </label>
          <input
            className="input serif"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            placeholder={suggestedName ? `e.g. ${suggestedName}` : 'A name to anchor this moment'}
            autoFocus
            disabled={!consent}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{
          marginTop: 22, padding: '10px 14px',
          background: 'var(--bg)', borderRadius: 4,
          fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic',
          fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5,
        }}>
          Your name and the time are kept with the recording, never shown to anyone else.
          It marks that you, the rabbi, were present.
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 22, justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
          <button
            className="btn primary"
            onClick={begin}
            disabled={!canBegin}>
            Begin recording
          </button>
        </div>
      </div>
    </div>
  );
}
