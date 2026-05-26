'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useTemplates } from '@/app/_lib/templates-store';
import { I } from '../Icons';

export function NewFileModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { create } = useEncounters();
  const { templates, setTemplates } = useTemplates();
  const [type, setType] = useState('hesped');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  // Inline "add custom type" state
  const [addingType, setAddingType] = useState(false);
  const [newHeb, setNewHeb] = useState('');
  const [newEn, setNewEn] = useState('');

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

  const handleAddType = () => {
    if (!newEn.trim()) return;
    const id = newEn.trim().toLowerCase().replace(/\s+/g, '_');
    // Don't add duplicates
    if (templates.some((t) => t.id === id)) {
      setType(id);
      setAddingType(false);
      return;
    }
    setTemplates((prev) => [
      ...prev,
      {
        id,
        heb: newHeb.trim() || newEn.trim(),
        en: newEn.trim(),
        sections: '',
        desc: '',
        prompt: `Based on the encounter transcript and notes, create a ${newEn.trim().toLowerCase()} that is well-structured, thoughtful, and appropriate for the context. Draw on relevant themes, sources, and insights from the conversation.`,
        variables: ['transcript', 'notes', 'sparks', 'sources'],
      },
    ]);
    setType(id);
    setAddingType(false);
    setNewHeb('');
    setNewEn('');
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

          {!addingType ? (
            <button
              className="btn small"
              style={{ justifyContent: 'flex-start', borderStyle: 'dashed' }}
              onClick={() => setAddingType(true)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-3)', fontSize: 13 }}>
                <span style={{ width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{I.plus}</span>
                Add type
              </span>
            </button>
          ) : (
            <div className="nf-add-type">
              <input
                className="nf-add-type-input"
                value={newHeb}
                onChange={(e) => setNewHeb(e.target.value)}
                placeholder="עברית"
                style={{ direction: 'rtl', fontFamily: "'Frank Ruhl Libre', serif" }}
                autoFocus
              />
              <input
                className="nf-add-type-input"
                value={newEn}
                onChange={(e) => setNewEn(e.target.value)}
                placeholder="English name"
                onKeyDown={(e) => e.key === 'Enter' && handleAddType()}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn ghost small"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                  onClick={() => { setAddingType(false); setNewHeb(''); setNewEn(''); }}>
                  Cancel
                </button>
                <button
                  className="btn primary small"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                  onClick={handleAddType}
                  disabled={!newEn.trim()}>
                  Add
                </button>
              </div>
            </div>
          )}
        </div>

        <input
          className="input serif"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g., Goldberg Family)"
          autoFocus={!addingType}
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
