'use client';
// Plan 5 — types tightened (B1), duplicate sanitized (B8), still preserves
// Plan 4 behavior (heuristic-derived spine, sticky note, overflow menu).

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { StatusSpine } from '../StatusSpine';
import { StickyNote } from '../StickyNote';
import { OverflowMenu, MenuEntry } from '../OverflowMenu';
import { ConfirmDialog } from '../ConfirmDialog';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useTemplates } from '@/app/_lib/templates-store';
import { useWorkflows } from '@/app/_lib/workflows-store';
import { derivePhaseState, isWorkflowDone } from '@/app/_lib/phase-heuristics';
import { api } from '@/app/_lib/api';
import type { Encounter, CardView } from '@/app/_lib/types';

interface FileCardProps {
  encounter: Encounter;
  view: CardView;
  showSpine?: boolean;
  onSpark: (file: Encounter, text: string) => void;
  onInsight: (file: Encounter, text: string) => void;
  onTask: (file: Encounter, text: string) => void;
  onArchived?: (file: Encounter) => void;
  onDeleted?: (file: Encounter) => void;
}

function useCardMenu(
  encounter: Encounter,
  onArchived?: (f: Encounter) => void,
  onDeleted?: (f: Encounter) => void,
) {
  const router = useRouter();
  const { refresh, create, remove } = useEncounters();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const subject = encounter.subject || encounter.congregantName;

  const archive = async () => {
    await api.encounters.archive(encounter.id);
    await refresh();
    onArchived?.(encounter);
  };

  const unarchive = async () => {
    await api.encounters.unarchive(encounter.id);
    await refresh();
  };

  // B8 — strip server-side fields; regenerate task ids; reset progress on the copy.
  const duplicate = async () => {
    const {
      id: _id,
      createdAt: _c,
      updatedAt: _u,
      archivedAt: _a,
      tasks: oldTasks,
      generatedContent: _g,
      moments: _m,
      completedPhases: _cp,
      phase: _p,
      ...rest
    } = encounter;

    const tasks = (oldTasks || []).map((t) => ({
      ...t,
      id: crypto.randomUUID(),
      done: false,
      createdAt: new Date().toISOString(),
    }));

    await create({
      ...rest,
      congregantName: encounter.congregantName + ' (copy)',
      subject: encounter.subject ? encounter.subject + ' (copy)' : undefined,
      sealed: false,
      tasks,
    });
    await refresh();
  };

  const doDelete = async () => {
    await remove(encounter.id);
    onDeleted?.(encounter);
    setConfirmOpen(false);
  };

  const items: MenuEntry[] = encounter.archivedAt
    ? [
        { label: 'Restore from archive', onSelect: unarchive },
        { divider: true },
        { label: 'Delete forever…', destructive: true, onSelect: () => setConfirmOpen(true) },
      ]
    : [
        { label: 'Open', onSelect: () => router.push(`/files/${encounter.id}`) },
        { label: 'Duplicate', onSelect: duplicate },
        { divider: true },
        { label: 'Archive', onSelect: archive },
        { label: 'Delete…', destructive: true, onSelect: () => setConfirmOpen(true) },
      ];

  const dialog = (
    <ConfirmDialog
      open={confirmOpen}
      title={`Delete ${subject}?`}
      description="This permanently erases the transcript, drafts, sources, and notes for this file. If you might want it back, choose Archive instead."
      confirmText={subject}
      confirmLabel="Delete forever"
      onCancel={() => setConfirmOpen(false)}
      onConfirm={doDelete}
    />
  );

  return { items, dialog };
}

export function FileCard(props: FileCardProps) {
  const { view } = props;
  if (view === 'minimal') return <MinimalCard {...props} />;
  return <DetailedCard {...props} />;
}

function DetailedCard({ encounter, showSpine, onSpark, onInsight, onTask, onArchived, onDeleted }: FileCardProps) {
  const router = useRouter();
  const { patch } = useEncounters();
  const { getById: getTemplate } = useTemplates();
  const { getByTemplate, getById } = useWorkflows();
  const tpl = getTemplate(encounter.type);
  const wf = (encounter.workflowId && getById(encounter.workflowId)) || getByTemplate(encounter.type);
  const phases = wf?.phases || ['Meet', 'Record', 'Source', 'Draft', 'Deliver'];
  const phaseState = wf
    ? derivePhaseState(encounter, wf)
    : { current: encounter.phase || phases[0], completed: encounter.completedPhases || [] };
  const isDelivered = wf ? isWorkflowDone(phaseState, wf) : false;

  const showSpineFinal = showSpine ?? wf?.showSpine ?? true;
  const togglePhase = (p: string) => patch(encounter.id, { togglePhase: p });
  const { items, dialog } = useCardMenu(encounter, onArchived, onDeleted);

  return (
    <div className="card-host">
      <div
        className="card"
        style={{
          cursor: 'pointer', position: 'relative', minHeight: 220,
          padding: 22, display: 'flex', flexDirection: 'column', gap: 14,
          opacity: encounter.archivedAt ? 0.6 : 1,
        }}
        onClick={() => router.push(`/files/${encounter.id}`)}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--ink-3)',
            padding: '4px 8px', background: 'var(--bg-sunken)',
            borderRadius: 3, border: '1px solid var(--rule-soft)',
          }}>
            {tpl?.en || encounter.topic || 'Encounter'}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {encounter.archivedAt && (
              <span className="badge" style={{ fontSize: 9, padding: '2px 6px', color: 'var(--ink-3)' }}>Archived</span>
            )}
            {encounter.sealed && (
              <span className="badge sealed" style={{ fontSize: 9, padding: '2px 6px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                Sealed
              </span>
            )}
            <OverflowMenu items={items}/>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'Frank Ruhl Libre, serif', fontWeight: 700, fontSize: 24, lineHeight: 1.1, color: 'var(--ink)' }}>
            {encounter.subject || encounter.congregantName}
          </div>
          {encounter.subjectHeb && (
            <div style={{ fontFamily: 'Frank Ruhl Libre, serif', fontSize: 13, color: 'var(--ink-3)', direction: 'rtl', marginTop: 3 }}>
              {encounter.subjectHeb}
            </div>
          )}
        </div>

        {showSpineFinal && (
          <StatusSpine
            phases={phases}
            current={phaseState.current}
            completed={phaseState.completed}
            onToggle={togglePhase}
          />
        )}

        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px dashed var(--rule-soft)' }}>
          <div style={{ fontSize: 13, color: isDelivered ? 'var(--sage)' : 'var(--accent)', fontWeight: 600, marginBottom: 2 }}>
            {isDelivered ? '✓ Delivered' : (encounter.nextEvent || encounter.date)}
          </div>
          {encounter.nextEventRel && (
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>{encounter.nextEventRel}</div>
          )}
        </div>
      </div>

      <StickyNote
        onSpark={(t) => onSpark(encounter, t)}
        onInsight={(t) => onInsight(encounter, t)}
        onTask={(t) => onTask(encounter, t)}
      />
      {dialog}
    </div>
  );
}

function MinimalCard({ encounter, onSpark, onInsight, onTask, onArchived, onDeleted }: FileCardProps) {
  const router = useRouter();
  const { getById: getTemplate } = useTemplates();
  const { getByTemplate, getById } = useWorkflows();
  const tpl = getTemplate(encounter.type);
  const wf = (encounter.workflowId && getById(encounter.workflowId)) || getByTemplate(encounter.type);
  const phases = wf?.phases || ['Meet', 'Record', 'Source', 'Draft', 'Deliver'];
  const phaseState = wf
    ? derivePhaseState(encounter, wf)
    : { current: encounter.phase || phases[0], completed: encounter.completedPhases || [] };
  const idx = phases.indexOf(phaseState.current);
  const completedCount = phaseState.completed.length;
  const pct = phases.length > 1 ? (Math.max(idx, completedCount - 1) / (phases.length - 1)) * 100 : 0;
  const isDelivered = wf ? isWorkflowDone(phaseState, wf) : false;
  const sealLetter = encounter.subjectHeb?.[0] || tpl?.heb?.[0] || 'ד';
  const { items, dialog } = useCardMenu(encounter, onArchived, onDeleted);

  return (
    <div className="card-host">
      <div
        style={{
          cursor: 'pointer', position: 'relative', minHeight: 220,
          background: 'var(--bg-card-hi)',
          border: '1px solid var(--rule)',
          borderRadius: 6,
          padding: '22px 22px 0',
          display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-card)',
          overflow: 'hidden',
          opacity: encounter.archivedAt ? 0.6 : 1,
        }}
        onClick={() => router.push(`/files/${encounter.id}`)}>

        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
          <OverflowMenu items={items}/>
        </div>

        {encounter.sealed && (
          <div style={{
            position: 'absolute', top: -12, right: 24, width: 44, height: 44,
            background: 'var(--accent)', borderRadius: '50%',
            display: 'grid', placeItems: 'center',
            color: 'var(--bg-card-hi)',
            fontFamily: 'Frank Ruhl Libre, serif', fontSize: 18, fontWeight: 700,
            transform: 'rotate(-8deg)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            border: '2px solid var(--bg-card-hi)',
          }}>
            {sealLetter}
          </div>
        )}

        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em',
          textTransform: 'uppercase', color: 'var(--ink-3)',
          marginBottom: 14, marginRight: encounter.sealed ? 60 : 30,
        }}>
          {tpl?.en || encounter.topic || 'Encounter'} · {encounter.date}
          {encounter.archivedAt && <span style={{ marginLeft: 6, color: 'var(--ink-2)' }}>· archived</span>}
        </div>

        <div>
          <div style={{
            fontFamily: 'Frank Ruhl Libre, serif', fontWeight: 700,
            fontSize: 26, lineHeight: 1.05, color: 'var(--ink)',
            letterSpacing: '-0.005em', marginBottom: 4,
          }}>
            {encounter.subject || encounter.congregantName}
          </div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: 'var(--ink-2)' }}>
            {encounter.congregantName}
          </div>
        </div>

        <div style={{ flex: 1 }}/>

        <div style={{
          margin: '14px -22px 0', padding: '12px 22px',
          background: isDelivered ? 'var(--sage-soft)' : 'var(--bg)',
          borderTop: '1px solid var(--rule-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: isDelivered ? 'var(--sage)' : 'var(--accent)' }}>
              {isDelivered ? '✓ Delivered' : (encounter.nextEvent || encounter.date)}
            </div>
            {encounter.nextEventRel && (
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontStyle: 'italic' }}>{encounter.nextEventRel}</div>
            )}
          </div>
          <div style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em',
            color: 'var(--ink-3)', textTransform: 'uppercase',
          }}>
            {phaseState.current}
          </div>
        </div>

        <div style={{ margin: '0 -22px', height: 3, background: 'var(--bg-sunken)' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: isDelivered ? 'var(--sage)' : 'var(--accent)', transition: 'width 300ms' }}/>
        </div>
      </div>

      <StickyNote
        onSpark={(t) => onSpark(encounter, t)}
        onInsight={(t) => onInsight(encounter, t)}
        onTask={(t) => onTask(encounter, t)}
      />
      {dialog}
    </div>
  );
}
