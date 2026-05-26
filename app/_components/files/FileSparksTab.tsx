'use client';
// Plan 6 — Insights tab body. Same data as the global Sparks inbox,
// filtered by fileId. Composable for direct embedding too.

import { useMemo, useState } from 'react';
import { I } from '../Icons';
import { useSparks, SPARK_CATEGORIES } from '@/app/_lib/sparks-store';
import type { Encounter, Spark } from '@/app/_lib/types';

export function FileSparksTab({ file }: { file: Encounter }) {
  const { sparks, create, patch, remove, assignToFile } = useSparks();
  const fileSparks = useMemo(() => sparks.filter((s) => s.fileId === file.id), [sparks, file.id]);

  const [newSpark, setNewSpark] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const addSpark = async () => {
    const body = newSpark.trim();
    if (!body) return;
    await create({ body, fileId: file.id, tag: 'Insight' });
    setNewSpark('');
  };

  return (
    <div>
      <div className="section-head">
        <div>
          <h2 className="section-title">ניצוצות</h2>
          <div className="section-title-en">Insights for this file · {fileSparks.length}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <textarea
          className="input serif"
          rows={2}
          value={newSpark}
          onChange={(e) => setNewSpark(e.target.value)}
          placeholder="A thought sparked by this conversation..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addSpark();
          }}
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            color: 'var(--ink-3)', letterSpacing: '0.06em',
          }}>
            ⌘↵ to save
          </span>
          <button className="btn primary small" disabled={!newSpark.trim()} onClick={addSpark}>
            <span className="icon">{I.plus}</span> Capture
          </button>
        </div>
      </div>

      {fileSparks.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 16, color: 'var(--ink-3)' }}>
            No insights yet for this file. Hover any card to capture one — or paste from Sparks.
          </p>
        </div>
      ) : (
        <div className="insight-grid">
          {fileSparks.map((s) => (
            <SparkCard
              key={s.id}
              spark={s}
              isEditing={editingId === s.id}
              editText={editText}
              onStartEdit={() => { setEditingId(s.id); setEditText(s.body); }}
              onEditChange={setEditText}
              onSaveEdit={async () => {
                await patch(s.id, { body: editText });
                setEditingId(null);
              }}
              onCancelEdit={() => setEditingId(null)}
              onCategoryChange={(cat) => patch(s.id, { category: cat })}
              onMoveToInbox={() => assignToFile(s.id, null)}
              onDelete={() => remove(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SparkCardProps {
  spark: Spark;
  isEditing: boolean;
  editText: string;
  onStartEdit: () => void;
  onEditChange: (v: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onCategoryChange: (cat: string) => void;
  onMoveToInbox: () => void;
  onDelete: () => void;
}

function SparkCard({
  spark, isEditing, editText,
  onStartEdit, onEditChange, onSaveEdit, onCancelEdit,
  onCategoryChange, onMoveToInbox, onDelete,
}: SparkCardProps) {
  return (
    <div className="insight-card card">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div className="insight-tag" style={{ flex: 1 }}>{spark.tag || 'Insight'}</div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            className="btn ghost small"
            style={{ minHeight: 24, minWidth: 24, padding: 2 }}
            onClick={onStartEdit}
            title="Edit">
            ✎
          </button>
          <button
            className="btn ghost small"
            style={{ minHeight: 24, minWidth: 24, padding: 2 }}
            onClick={onMoveToInbox}
            title="Move to global Sparks inbox">
            ↑
          </button>
          <button
            className="btn ghost small"
            style={{ minHeight: 24, minWidth: 24, padding: 2 }}
            onClick={onDelete}
            title="Delete">
            ×
          </button>
        </div>
      </div>

      {isEditing ? (
        <div>
          <textarea
            className="input serif"
            rows={3}
            value={editText}
            onChange={(e) => onEditChange(e.target.value)}
            autoFocus
            style={{ marginBottom: 8, fontSize: 15 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSaveEdit();
              if (e.key === 'Escape') onCancelEdit();
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn small primary" onClick={onSaveEdit}>Save</button>
            <button className="btn ghost small" onClick={onCancelEdit}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="insight-body">{spark.body}</div>
      )}

      {spark.url && (
        <div className="mono" style={{ fontSize: 9, color: 'var(--accent)', wordBreak: 'break-all' }}>
          {spark.url.substring(0, 60)}{spark.url.length > 60 ? '...' : ''}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <select
          className="mono"
          value={spark.category || 'Uncategorized'}
          onChange={(e) => onCategoryChange(e.target.value)}
          style={{
            fontSize: 9, background: 'var(--bg-sunken)', border: '1px solid var(--rule-soft)',
            borderRadius: 3, padding: '2px 4px', color: 'var(--ink-3)', cursor: 'pointer',
          }}>
          {SPARK_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <div className="insight-foot">{spark.when}</div>
      </div>
    </div>
  );
}
