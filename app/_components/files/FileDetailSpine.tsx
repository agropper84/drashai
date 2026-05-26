'use client';
// The big spine that appears on the file detail, between the header meta row
// and the tab bar. Clicking a phase navigates to its mapped tab AND toggles
// the phase done. Includes a "Mark Delivered" button on the right.

import { useRouter } from 'next/navigation';
import { StatusSpine } from '../StatusSpine';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useWorkflows } from '@/app/_lib/workflows-store';
import { derivePhaseState, tabForPhase } from '@/app/_lib/phase-heuristics';
import type { Encounter } from '@/app/_lib/types';

export function FileDetailSpine({ file }: { file: Encounter }) {
  const router = useRouter();
  const { patch } = useEncounters();
  const { getByTemplate, getById } = useWorkflows();
  const workflow = (file.workflowId && getById(file.workflowId)) || getByTemplate(file.type);
  if (!workflow || workflow.phases.length === 0) return null;

  const { current, completed } = derivePhaseState(file, workflow);
  const last = workflow.phases[workflow.phases.length - 1];
  const isDelivered = completed.includes(last);

  const onPhaseClick = (phase: string) => {
    // Two things happen on click:
    // (1) navigate to the mapped tab for that phase
    // (2) toggle completed (so the user can mark phases out-of-order)
    const tab = tabForPhase(phase, workflow);
    router.push(`/files/${file.id}/${tab}`);
    patch(file.id, { togglePhase: phase });
  };

  const markDelivered = async () => {
    if (isDelivered) return;
    await patch(file.id, { togglePhase: last });
    // Workflow's autoSeal applied separately by the backend if configured.
    if (workflow.autoSeal && !file.sealed) {
      await patch(file.id, { sealed: true });
    }
    router.push(`/files/${file.id}/final`);
  };

  return (
    <div className="file-detail-spine">
      <div className="file-detail-spine-main">
        <StatusSpine
          phases={workflow.phases}
          current={current}
          completed={completed}
          size="lg"
          onToggle={onPhaseClick}
        />
      </div>
      <div className="file-detail-spine-side">
        {!isDelivered ? (
          <button type="button" className="btn primary small" onClick={markDelivered}>
            Mark delivered
          </button>
        ) : (
          <span className="badge" style={{
            background: 'var(--sage-soft)', color: 'var(--sage)', borderColor: 'var(--sage)',
            fontSize: 10, padding: '4px 10px',
          }}>
            ✓ Delivered
          </span>
        )}
      </div>
    </div>
  );
}
