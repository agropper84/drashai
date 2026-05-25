'use client';
// Plan 3 — adds Active / Archived filter chips. Archived files are fetched
// on demand via api.encounters.list({ includeArchived: true }).

import { useEffect, useMemo, useState } from 'react';
import { I } from '@/app/_components/Icons';
import { FileCard } from '@/app/_components/files/FileCard';
import { ViewToggle } from '@/app/_components/ViewToggle';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useSparks } from '@/app/_lib/sparks-store';
import { useWorkflows } from '@/app/_lib/workflows-store';
import { useModal } from '@/app/_components/modals/ModalProvider';
import { api } from '@/app/_lib/api';
import type { CardView, Encounter, Spark } from '@/app/_lib/types';

type Filter = 'active' | 'archived';

export default function FilesPage() {
  const { encounters, loading, patch, refresh } = useEncounters();
  const { setSparks } = useSparks();
  const { workflows } = useWorkflows();
  const { open } = useModal();

  const [view, setView] = useState<CardView>('detailed');
  const [showSpine, setShowSpine] = useState(true);
  const [filter, setFilter] = useState<Filter>('active');
  const [archivedList, setArchivedList] = useState<Encounter[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('drashai.cardView') as CardView | null;
    if (stored) setView(stored);
    else {
      const counts: Record<CardView, number> = { detailed: 0, minimal: 0 };
      workflows.forEach((w) => counts[w.defaultView]++);
      setView(counts.minimal > counts.detailed ? 'minimal' : 'detailed');
    }
  }, [workflows]);

  useEffect(() => {
    localStorage.setItem('drashai.cardView', view);
  }, [view]);

  // When user switches to "Archived", fetch the full archived list.
  useEffect(() => {
    if (filter !== 'archived') return;
    let cancelled = false;
    api.encounters.list({ includeArchived: true }).then((data) => {
      if (cancelled) return;
      setArchivedList(data.encounters.filter((e) => !!e.archivedAt));
    });
    return () => { cancelled = true; };
  }, [filter]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleSpark = (file: Encounter, text: string) => {
    const spark: Spark = { id: crypto.randomUUID(), body: text, tag: 'Thought', when: new Date().toLocaleDateString() };
    setSparks((prev) => [spark, ...prev]);
    flash('Spark captured');
  };
  const handleInsight = (file: Encounter, text: string) => {
    const spark: Spark = { id: crypto.randomUUID(), body: text, tag: 'Insight', when: new Date().toLocaleDateString(), fileId: file.id };
    setSparks((prev) => [spark, ...prev]);
    flash(`Insight added to ${file.subject || file.congregantName}`);
  };
  const handleTask = async (file: Encounter, text: string) => {
    await patch(file.id, { addTask: { body: text } });
    flash(`Task added to ${file.subject || file.congregantName}`);
  };
  const handleArchived = (file: Encounter) => {
    flash(`Archived ${file.subject || file.congregantName}`);
  };
  const handleDeleted = (file: Encounter) => {
    flash(`Deleted ${file.subject || file.congregantName}`);
    if (filter === 'archived') {
      setArchivedList((prev) => prev.filter((e) => e.id !== file.id));
    }
  };

  const visible = useMemo(() => {
    if (filter === 'archived') return archivedList;
    // active list = encounters that aren't archived (server already filters,
    // but we double-check in case of an optimistic update race).
    return encounters.filter((e) => !e.archivedAt);
  }, [filter, encounters, archivedList]);

  if (loading && filter === 'active') {
    return <div className="mono" style={{ color: 'var(--ink-3)' }}>Loading...</div>;
  }

  return (
    <>
      <div className="page-head">
        <div className="page-title-wrap">
          <div className="page-eyebrow">Your encounters</div>
          <h1 className="page-title heb-display">תיקים</h1>
          <div className="page-title-en">Files</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {view === 'detailed' && filter === 'active' && (
            <label style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: 'var(--ink-3)', cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={showSpine}
                onChange={(e) => setShowSpine(e.target.checked)}
                style={{ accentColor: 'var(--accent)' }}
              />
              Show status spine
            </label>
          )}
          <ViewToggle value={view} onChange={setView}/>
          <button className="btn" onClick={() => open('record')}>
            <span className="icon">{I.mic}</span> Quick Record
          </button>
          <button className="btn primary" onClick={() => open('new')}>
            <span className="icon">{I.plus}</span> New File
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        <button
          type="button"
          className={'tab ' + (filter === 'active' ? 'active' : '')}
          style={{ padding: '6px 12px', fontSize: 12 }}
          onClick={() => setFilter('active')}>
          Active {encounters.filter((e) => !e.archivedAt).length > 0 && (
            <span className="count">{encounters.filter((e) => !e.archivedAt).length}</span>
          )}
        </button>
        <button
          type="button"
          className={'tab ' + (filter === 'archived' ? 'active' : '')}
          style={{ padding: '6px 12px', fontSize: 12 }}
          onClick={() => setFilter('archived')}>
          Archived
          {archivedList.length > 0 && <span className="count">{archivedList.length}</span>}
        </button>
      </div>

      {visible.length === 0 ? (
        filter === 'archived' ? (
          <div className="empty-state">
            <p style={{ fontSize: 18 }}>No archived files</p>
            <p style={{ fontSize: 14, marginTop: 8, fontStyle: 'italic', color: 'var(--ink-3)' }}>
              When you archive a file from its card menu, it lands here.
              Archived files are kept forever unless you explicitly erase them in Settings.
            </p>
          </div>
        ) : (
          <EmptyState onNew={() => open('new')} />
        )
      ) : (
        <div className="file-grid">
          {visible.map((enc) => (
            <FileCard
              key={enc.id}
              encounter={enc}
              view={view}
              showSpine={view === 'detailed' ? showSpine : undefined}
              onSpark={handleSpark}
              onInsight={handleInsight}
              onTask={handleTask}
              onArchived={handleArchived}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {toast && (
        <div className="drashai-toast">{toast}</div>
      )}
    </>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="empty-state">
      <div className="heb-display" style={{ fontSize: 48, marginBottom: 12, opacity: 0.2 }}>דרשאי</div>
      <p style={{ fontSize: 18 }}>No encounters yet</p>
      <p style={{ fontSize: 14, marginTop: 8 }}>Create your first file to begin</p>
      <button className="btn primary" style={{ marginTop: 20 }} onClick={onNew}>+ New File</button>
    </div>
  );
}
