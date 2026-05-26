'use client';
// Plan 10 — Voice Training moves to the TOP of the editor. Other sections
// (basics, body, prompt, variables) follow.

import { useState } from 'react';
import { I } from '@/app/_components/Icons';
import { useTemplates } from '@/app/_lib/templates-store';
import { VoiceTrainingSection } from '@/app/_components/templates/VoiceTrainingSection';
import { voiceStrength } from '@/app/_lib/voice-training';
import type { Template } from '@/app/_lib/types';

const EMPTY_TEMPLATE: Template = {
  id: '', heb: '', en: '', sections: '', desc: '', prompt: '',
};

export default function TemplatesPage() {
  const { templates, setTemplates } = useTemplates();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTempl, setEditTempl] = useState<Template | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTempl, setNewTempl] = useState<Template>(EMPTY_TEMPLATE);

  const startNew = () => {
    setNewTempl({ ...EMPTY_TEMPLATE, id: crypto.randomUUID() });
    setShowNew(true);
    setEditingId(null);
  };
  const startEdit = (t: Template) => {
    setEditTempl({ ...t });
    setEditingId(t.id);
    setShowNew(false);
  };
  const closeEditor = () => { setEditingId(null); setShowNew(false); };
  const handleSave = () => {
    if (showNew) {
      if (!newTempl.en.trim()) return;
      setTemplates((prev) => [...prev, { ...newTempl, id: newTempl.id || crypto.randomUUID() }]);
      setShowNew(false);
    } else if (editTempl) {
      setTemplates((prev) => prev.map((x) => (x.id === editTempl.id ? editTempl : x)));
      setEditingId(null);
    }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-title-wrap">
          <div className="page-eyebrow">Document structures</div>
          <h1 className="page-title heb-display">תבניות</h1>
          <div className="page-title-en">Templates</div>
        </div>
        <button className="btn primary" onClick={startNew}>
          <span className="icon">{I.plus}</span> New Template
        </button>
      </div>

      {(editingId || showNew) && (
        <TemplateEditor
          template={showNew ? newTempl : editTempl}
          isNew={showNew}
          onChange={(updater) => {
            if (showNew) setNewTempl(updater);
            else setEditTempl((prev) => (prev ? updater(prev) : prev));
          }}
          onSave={handleSave}
          onCancel={closeEditor}
        />
      )}

      <div className="template-grid">
        {templates.map((t) => {
          const strength = voiceStrength(t);
          return (
            <div key={t.id} className="card template-card" onClick={() => startEdit(t)} style={{ cursor: 'pointer' }}>
              <div className="template-name">{t.heb}</div>
              <div className="template-en">{t.en}</div>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>{t.desc}</p>
              <div className="template-sections">{t.sections}</div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className={`voice-training-pill level-${strength.level}`}>
                  Voice · {strength.level === 'none' ? 'untrained' : strength.level}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function TemplateEditor({
  template, isNew, onChange, onSave, onCancel,
}: {
  template: Template | null;
  isNew: boolean;
  onChange: (updater: (prev: Template) => Template) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!template) return null;
  const t = template;

  return (
    <div className="card" style={{ padding: 24, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
          {isNew ? 'New Template' : 'Edit Template'}
        </h3>
        <button className="btn ghost small" onClick={onCancel}>
          <span className="icon" style={{ width: 14, height: 14 }}>{I.x}</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* PLAN 10 — Voice training FIRST */}
        <VoiceTrainingSection template={t} onChange={onChange}/>

        <hr className="divider" style={{ margin: '4px 0' }} />

        {/* Basics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Hebrew Name</div>
            <input className="input serif" value={t.heb}
              onChange={(e) => onChange((p) => ({ ...p, heb: e.target.value }))}
              placeholder="e.g., הספד" style={{ direction: 'rtl' }}/>
          </div>
          <div>
            <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>English Name</div>
            <input className="input serif" value={t.en}
              onChange={(e) => onChange((p) => ({ ...p, en: e.target.value }))}
              placeholder="e.g., Eulogy (Hesped)"/>
          </div>
        </div>

        <div>
          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Description</div>
          <input className="input serif" value={t.desc}
            onChange={(e) => onChange((p) => ({ ...p, desc: e.target.value }))}
            placeholder="A brief description"/>
        </div>

        <div>
          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Sections</div>
          <input className="input" value={t.sections}
            onChange={(e) => onChange((p) => ({ ...p, sections: e.target.value }))}
            placeholder="Opening, Body, Torah, Closing"/>
        </div>

        <hr className="divider" style={{ margin: '4px 0' }} />

        <div>
          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Full Template Body</div>
          <textarea className="input serif" rows={6}
            value={t.fullBody || ''}
            onChange={(e) => onChange((p) => ({ ...p, fullBody: e.target.value }))}
            placeholder={'[Opening]\nWe gather today to honor {{subject}}...'}/>
        </div>

        <div>
          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>AI Generation Prompt</div>
          <textarea className="input" rows={5}
            value={t.prompt}
            onChange={(e) => onChange((p) => ({ ...p, prompt: e.target.value }))}
            placeholder="Based on the encounter transcript with {{subject}}..."
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.6 }}/>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn primary" onClick={onSave}>
            {isNew ? 'Create Template' : 'Save Changes'}
          </button>
          <button className="btn ghost" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
