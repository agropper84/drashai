'use client';
// Plan 8 — always renders. Falls back to a generic workflow when nothing matches.

import { useRouter } from 'next/navigation';
import { StatusSpine } from '../StatusSpine';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useWorkflows } from '@/app/_lib/workflows-store';
import { derivePhaseState, isWorkflowDone, tabForPhase } from '@/app/_lib/phase-heuristics';
import type { Encounter } from '@/app/_lib/types';

export function FileDetailSpine({ file }: { file: Encounter }) {
  const router = useRouter();
  const { patch } = useEncounters();
  const { getEffectiveWorkflow } = useWorkflows();
  const workflow = getEffectiveWorkflow(file);
  if (workflow.phases.length === 0) return null;

  const state = derivePhaseState(file, workflow);
  const last = workflow.phases[workflow.phases.length - 1];
  const isDelivered = isWorkflowDone(state, workflow);

  const onDotClick = (phase: string) => patch(file.id, { togglePhase: phase });
  const onLabelClick = (phase: string) => {
    const tab = tabForPhase(phase, workflow);
    router.push(`/files/${file.id}/${tab}`);
  };

  const markDelivered = async () => {
    if (isDelivered) return;
    const body: Record<string, unknown> = { togglePhase: last };
    if (workflow.autoSeal && !file.sealed) body.sealed = true;
    await patch(file.id, body);
    router.push(`/files/${file.id}/final`);
  };

  return (
    <div className="file-detail-spine">
      <div className="file-detail-spine-main">
        <StatusSpine
          phases={workflow.phases}
          current={state.current}
          completed={state.completed}
          size="lg"
          onDotClick={onDotClick}
          onLabelClick={onLabelClick}
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
