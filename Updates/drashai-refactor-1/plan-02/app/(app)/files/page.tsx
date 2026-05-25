'use client';
// Plan 2 — file list with view toggle + show-spine + sticky-note handlers.

import { useEffect, useState } from 'react';
import { I } from '@/app/_components/Icons';
import { FileCard } from '@/app/_components/files/FileCard';
import { ViewToggle } from '@/app/_components/ViewToggle';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useSparks } from '@/app/_lib/sparks-store';
import { useWorkflows } from '@/app/_lib/workflows-store';
import { useModal } from '@/app/_components/modals/ModalProvider';
import type { CardView, Encounter, Spark } from '@/app/_lib/types';

export default function FilesPage() {
  const { encounters, loading, patch } = useEncounters();
  const { setSparks } = useSparks();
  const { workflows } = useWorkflows();
  const { open } = useModal();

  // Default view = the most common view among the user's workflows.
  // Persist user override in localStorage.
  const [view, setView] = useState<CardView>('detailed');
  const [showSpine, setShowSpine] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('drashai.cardView') as CardView | null;
    if (stored) setView(stored);
    else {
      // pick the modal default across workflows
      const counts: Record<CardView, number> = { detailed: 0, minimal: 0 };
      workflows.forEach((w) => counts[w.defaultView]++);
      setView(counts.minimal > counts.detailed ? 'minimal' : 'detailed');
    }
  }, [workflows]);

  useEffect(() => {
    localStorage.setItem('drashai.cardView', view);
  }, [view]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleSpark = (file: Encounter, text: string) => {
    const spark: Spark = {
      id: crypto.randomUUID(),
      body: text,
      tag: 'Thought',
      when: new Date().toLocaleDateString(),
    };
    setSparks((prev) => [spark, ...prev]);
    flash('Spark captured');
  };

  const handleInsight = (file: Encounter, text: string) => {
    const spark: Spark = {
      id: crypto.randomUUID(),
      body: text,
      tag: 'Insight',
      when: new Date().toLocaleDateString(),
      fileId: file.id,
    };
    setSparks((prev) => [spark, ...prev]);
    flash(`Insight added to ${file.subject || file.congregantName}`);
  };

  const handleTask = async (file: Encounter, text: string) => {
    await patch(file.id, { addTask: { body: text } });
    flash(`Task added to ${file.subject || file.congregantName}`);
  };

  if (loading) {
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
          {view === 'detailed' && (
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

      {encounters.length === 0 ? (
        <EmptyState onNew={() => open('new')} />
      ) : (
        <div className="file-grid">
          {encounters.map((enc) => (
            <FileCard
              key={enc.id}
              encounter={enc}
              view={view}
              showSpine={view === 'detailed' ? showSpine : undefined}
              onSpark={handleSpark}
              onInsight={handleInsight}
              onTask={handleTask}
            />
          ))}
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--ink-1)', color: 'var(--bg-card-hi)',
          padding: '10px 18px', borderRadius: 6,
          fontFamily: 'Cormorant Garamond, serif', fontSize: 15,
          boxShadow: 'var(--shadow-lift)', zIndex: 100,
        }}>
          {toast}
        </div>
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
      <button className="btn primary" style={{ marginTop: 20 }} onClick={onNew}>
        + New File
      </button>
    </div>
  );
}
