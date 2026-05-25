'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useTemplates } from '@/app/_lib/templates-store';

export function NewFileModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { create } = useEncounters();
  const { templates } = useTemplates();
  const [type, setType] = useState('hesped');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const tmpl = templates.find((t) => t.id === type);
      const enc = await create({
        congregantName: name.trim(),
        topic: tmpl?.en || type,
        type,
      });
      setName('');
      onClose();
      router.push(`/files/${enc.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-shroud" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-eyebrow">New encounter</div>
        <h2 className="modal-title">תיק חדש</h2>
        <div className="modal-title-en">Create a new file</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {templates.map((ft) => (
            <button
              key={ft.id}
              className={`btn small ${type === ft.id ? 'primary' : ''}`}
              style={{ justifyContent: 'flex-start' }}
              onClick={() => setType(ft.id)}>
              <span className="heb" style={{ fontSize: 14 }}>{ft.heb}</span>
              <span style={{ fontSize: 12, color: type === ft.id ? 'inherit' : 'var(--ink-3)' }}>
                {ft.en}
              </span>
            </button>
          ))}
        </div>

        <input
          className="input serif"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g., Goldberg Family)"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={handleCreate} disabled={creating || !name.trim()}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
