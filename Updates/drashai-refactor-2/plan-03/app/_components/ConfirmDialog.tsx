'use client';
// Destructive-action confirm with type-to-confirm gate.
// Usage:
//   const [open, setOpen] = useState(false);
//   <ConfirmDialog
//     open={open}
//     title="Delete Goldberg eulogy?"
//     description="..."
//     confirmText="Miriam Goldberg z\"l"
//     confirmLabel="Delete forever"
//     onCancel={() => setOpen(false)}
//     onConfirm={async () => { await api.encounters.delete(id); setOpen(false); }}
//   />

import { useEffect, useState } from 'react';

export function ConfirmDialog({
  open,
  title,
  description,
  /** Exact text user must type to enable the confirm button. */
  confirmText,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmText: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTyped('');
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const matches = typed.trim() === confirmText;
  const handleConfirm = async () => {
    if (!matches || busy) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-shroud" onClick={onCancel}>
      <div className="modal confirm-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
        <div className="modal-eyebrow" style={{ color: destructive ? 'var(--accent)' : undefined }}>
          {destructive ? 'Destructive action' : 'Confirm'}
        </div>
        <h2 className="modal-title" style={{ fontSize: 24, lineHeight: 1.15 }}>{title}</h2>

        {description && (
          <p style={{
            fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic',
            fontSize: 15, lineHeight: 1.55, color: 'var(--ink-1)', marginTop: 8,
          }}>
            {description}
          </p>
        )}

        <div style={{ marginTop: 20 }}>
          <label style={{ fontSize: 13, color: 'var(--ink-2)', display: 'block', marginBottom: 6 }}>
            Type <code style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600,
              background: 'var(--bg-sunken)', padding: '1px 6px', borderRadius: 3,
              color: 'var(--ink)',
            }}>{confirmText}</code> to confirm
          </label>
          <input
            className="input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmText}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matches) handleConfirm();
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 22 }}>
          <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={'btn ' + (destructive ? 'destructive' : 'primary')}
            onClick={handleConfirm}
            disabled={!matches || busy}>
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
