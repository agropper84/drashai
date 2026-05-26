'use client';
// Unified file card — minimal aesthetic with optional status spine.

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
import type { Encounter } from '@/app/_lib/types';

interface FileCardProps {
  encounter: Encounter;
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

  const duplicate = async () => {
    const {
      id: _id, createdAt: _c, updatedAt: _u, archivedAt: _a,
      tasks: oldTasks, generatedContent: _g, moments: _m,
      completedPhases: _cp, phase: _p, ...rest
    } = encounter;
    const tasks = (oldTasks || []).map((t) => ({
      ...t, id: crypto.randomUUID(), done: false, createdAt: new Date().toISOString(),
    }));
    await create({
      ...rest,
      congregantName: encounter.congregantName + ' (copy)',
      subject: encounter.subject ? encounter.subject + ' (copy)' : undefined,
      sealed: false, tasks,
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

export function FileCard({ encounter, showSpine, onSpark, onInsight, onTask, onArchived, onDeleted }: FileCardProps) {
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
  const sealLetter = encounter.subjectHeb?.[0] || tpl?.heb?.[0] || 'ד';
  const showSpineFinal = showSpine ?? wf?.showSpine ?? true;
  const togglePhase = (p: string) => patch(encounter.id, { togglePhase: p });
  const { items, dialog } = useCardMenu(encounter, onArchived, onDeleted);

  return (
    <div className="card-host">
      <div
        className="file-card-unified"
        style={{ opacity: encounter.archivedAt ? 0.6 : 1 }}
        onClick={() => router.push(`/files/${encounter.id}`)}>

        <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
          <OverflowMenu items={items}/>
        </div>

        {encounter.sealed && (
          <div className="file-card-seal">
            {sealLetter}
          </div>
        )}

        {/* Header: type badge + date */}
        <div className="file-card-eyebrow" style={{ marginRight: encounter.sealed ? 60 : 30 }}>
          <span className="file-card-type-badge">
            {tpl?.en || encounter.topic || 'Encounter'}
          </span>
          <span className="file-card-date">{encounter.date}</span>
          {encounter.archivedAt && <span className="file-card-archived">archived</span>}
        </div>

        {/* Title */}
        <div className="file-card-title">
          {encounter.subject || encounter.congregantName}
        </div>
        {encounter.subjectHeb && (
          <div className="file-card-title-heb">{encounter.subjectHeb}</div>
        )}

        {/* Status spine */}
        {showSpineFinal && (
          <div className="file-card-spine">
            <StatusSpine
              phases={phases}
              current={phaseState.current}
              completed={phaseState.completed}
              compact
              onToggle={togglePhase}
            />
          </div>
        )}

        <div style={{ flex: 1 }}/>

        {/* Footer */}
        <div className="file-card-footer" style={{
          background: isDelivered ? 'var(--sage-soft)' : 'var(--bg)',
        }}>
          <div>
            <div className="file-card-event" style={{ color: isDelivered ? 'var(--sage)' : 'var(--accent)' }}>
              {isDelivered ? '✓ Delivered' : (encounter.nextEvent || encounter.date)}
            </div>
            {encounter.nextEventRel && (
              <div className="file-card-event-rel">{encounter.nextEventRel}</div>
            )}
          </div>
          <div className="file-card-phase">
            {phaseState.current}
          </div>
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
