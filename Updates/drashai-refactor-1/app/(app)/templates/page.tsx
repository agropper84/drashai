'use client';
// Templates page — editor + grid. Lifted from old App with state moved to useTemplates().
// Plan 10 will reorder the editor so Style Examples (voice training) comes first.

import { useState } from 'react';
import { I } from '@/app/_components/Icons';
import { useTemplates } from '@/app/_lib/templates-store';
import { api } from '@/app/_lib/api';
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

  const closeEditor = () => {
    setEditingId(null);
    setShowNew(false);
  };

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
        {templates.map((t) => (
          <div
            key={t.id}
            className="card template-card"
            onClick={() => startEdit(t)}
            style={{ cursor: 'pointer' }}>
            <div className="template-name">{t.heb}</div>
            <div className="template-en">{t.en}</div>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>{t.desc}</p>
            <div className="template-sections">{t.sections}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <button
                className="btn ghost small"
                onClick={(e) => { e.stopPropagation(); startEdit(t); }}>
                Edit
              </button>
              {!t.builtIn && (
                <button
                  className="btn ghost small"
                  style={{ color: 'var(--accent)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
                  }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Editor sub-component ───────────────────────────────
function TemplateEditor({
  template,
  isNew,
  onChange,
  onSave,
  onCancel,
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Basic info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Hebrew Name</div>
            <input
              className="input serif"
              value={t.heb}
              onChange={(e) => onChange((p) => ({ ...p, heb: e.target.value }))}
              placeholder="e.g., הספד"
              style={{ direction: 'rtl' }}
            />
          </div>
          <div>
            <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>English Name</div>
            <input
              className="input serif"
              value={t.en}
              onChange={(e) => onChange((p) => ({ ...p, en: e.target.value }))}
              placeholder="e.g., Eulogy (Hesped)"
            />
          </div>
        </div>

        <div>
          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Description</div>
          <input
            className="input serif"
            value={t.desc}
            onChange={(e) => onChange((p) => ({ ...p, desc: e.target.value }))}
            placeholder="A brief description of this template"
          />
        </div>

        <div>
          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Sections</div>
          <input
            className="input"
            value={t.sections}
            onChange={(e) => onChange((p) => ({ ...p, sections: e.target.value }))}
            placeholder="Opening, Body, Torah, Closing (comma-separated)"
          />
          <div className="settings-help">Comma-separated section names that define the document structure</div>
        </div>

        <hr className="divider" style={{ margin: '4px 0' }} />

        <div>
          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Full Template Body</div>
          <div className="settings-help" style={{ marginBottom: 8 }}>
            Write the complete document skeleton. The AI will fill in content based on the encounter.
          </div>
          <textarea
            className="input serif"
            rows={8}
            value={t.fullBody || ''}
            onChange={(e) => onChange((p) => ({ ...p, fullBody: e.target.value }))}
            placeholder={'[Opening]\nWe gather today to honor the memory of {{subject}}...\n\n[Life Story]\n...'}
          />
        </div>

        <hr className="divider" style={{ margin: '4px 0' }} />

        <div>
          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>AI Generation Prompt</div>
          <div className="settings-help" style={{ marginBottom: 8 }}>
            Instructions for the AI when generating content using this template.
          </div>
          <textarea
            className="input"
            rows={5}
            value={t.prompt}
            onChange={(e) => onChange((p) => ({ ...p, prompt: e.target.value }))}
            placeholder="Based on the encounter transcript with {{subject}}, create a document that..."
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.6 }}
          />
          <div className="settings-help" style={{ marginTop: 6 }}>
            Variables:{' '}
            {['{{transcript}}', '{{subject}}', '{{notes}}', '{{documents}}', '{{sparks}}', '{{sources}}', '{{template_body}}'].map((v) => (
              <code
                key={v}
                className="mono"
                style={{
                  fontSize: 10, padding: '1px 4px', background: 'var(--bg-sunken)',
                  borderRadius: 3, marginRight: 4,
                }}>
                {v}
              </code>
            ))}
          </div>
        </div>

        <hr className="divider" style={{ margin: '4px 0' }} />

        <div>
          <div className="settings-label" style={{ fontSize: 13, marginBottom: 8 }}>Include in Generation</div>
          <div className="settings-help" style={{ marginBottom: 10 }}>
            Select which context the AI receives when generating with this template.
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { key: 'transcript', label: 'Encounter transcript' },
              { key: 'notes', label: 'Private notes' },
              { key: 'documents', label: 'Uploaded documents' },
              { key: 'sparks', label: 'Related sparks' },
              { key: 'sources', label: 'Attached sources' },
            ].map((v) => {
              const active = (t.variables || ['transcript', 'notes']).includes(v.key);
              return (
                <button
                  key={v.key}
                  className={`btn small ${active ? 'primary' : ''}`}
                  style={{ fontSize: 12 }}
                  onClick={() => onChange((p) => {
                    const vars = p.variables || ['transcript', 'notes'];
                    return { ...p, variables: active ? vars.filter((x) => x !== v.key) : [...vars, v.key] };
                  })}>
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        <hr className="divider" style={{ margin: '4px 0' }} />

        {/* Style Examples — Plan 10 will promote this to the top */}
        <div>
          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Style Examples</div>
          <div className="settings-help" style={{ marginBottom: 10 }}>
            Upload documents that represent your writing style. The AI will match this tone, structure, and voice.
          </div>

          {(t.styleDocuments || []).map((doc, i) => (
            <div key={i} className="list-row" style={{ marginBottom: 6 }}>
              <div className="list-row-icon"><span className="icon">{I.doc}</span></div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{doc.name}</div>
                {doc.excerpt && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                    {doc.excerpt.substring(0, 80)}...
                  </div>
                )}
              </div>
              <button
                className="btn ghost small"
                onClick={() => onChange((p) => ({
                  ...p,
                  styleDocuments: (p.styleDocuments || []).filter((_, j) => j !== i),
                }))}>
                <span className="icon" style={{ width: 14, height: 14 }}>{I.trash}</span>
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8 }}>
            <label className="btn small" style={{ cursor: 'pointer' }}>
              <span className="icon">{I.doc}</span> Upload Document
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const data = await api.uploadDocument(file, 'templates');
                    let excerpt = '';
                    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                      excerpt = await file.text().then((txt) => txt.substring(0, 200));
                    }
                    onChange((p) => ({
                      ...p,
                      styleDocuments: [...(p.styleDocuments || []), { name: file.name, url: data.url, excerpt }],
                    }));
                  } catch (err) {
                    console.error('[Templates] upload failed:', err);
                  }
                  e.target.value = '';
                }}
              />
            </label>
            <button
              className="btn small"
              onClick={() => {
                const text = prompt('Paste a text excerpt that represents your style:');
                if (text?.trim()) {
                  onChange((p) => ({
                    ...p,
                    styleDocuments: [
                      ...(p.styleDocuments || []),
                      { name: 'Pasted excerpt', url: '', excerpt: text.trim() },
                    ],
                  }));
                }
              }}>
              <span className="icon">{I.copy}</span> Paste Text
            </button>
          </div>
        </div>

        <hr className="divider" style={{ margin: '4px 0' }} />

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
