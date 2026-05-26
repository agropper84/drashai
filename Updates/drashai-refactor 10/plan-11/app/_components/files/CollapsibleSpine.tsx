'use client';
// The full workflow spine — hidden by default, revealed by HeaderProgressPill.
// Smooth height transition.

import { useRouter } from 'next/navigation';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useWorkflows } from '@/app/_lib/workflows-store';
import { derivePhaseState, isWorkflowDone, tabForPhase } from '@/app/_lib/phase-heuristics';
import type { Encounter } from '@/app/_lib/types';

export interface CollapsibleSpineProps {
  file: Encounter;
  open: boolean;
}

export function CollapsibleSpine({ file, open }: CollapsibleSpineProps) {
  const router = useRouter();
  const { patch } = useEncounters();
  const { getEffectiveWorkflow } = useWorkflows();
  const workflow = getEffectiveWorkflow(file);
  if (workflow.phases.length === 0) return null;

  const state = derivePhaseState(file, workflow);
  const last = workflow.phases[workflow.phases.length - 1];
  const isDelivered = isWorkflowDone(state, workflow);
  const completedPct = Math.round((state.completed.length / workflow.phases.length) * 100);

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
    <div className={`fd-spine-collapse${open ? ' open' : ''}`}>
      <div className="fd-spine-card">
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
          <div className="fd-spine-row">
            {workflow.phases.map((p, i) => {
              const isCurrent = p === state.current;
              const isCompleted = state.completed.includes(p);
              return (
                <span key={p} style={{ display: 'contents' }}>
                  <button
                    type="button"
                    className={`fd-spine-dot${isCurrent ? ' current' : ''}${isCompleted ? ' done' : ''}`}
                    onClick={(e) => { e.stopPropagation(); onDotClick(p); }}
                    title={`Toggle "${p}"`}
                  />
                  {i < workflow.phases.length - 1 && (
                    <div className={`fd-spine-line${isCompleted ? ' done' : ''}`}/>
                  )}
                </span>
              );
            })}
          </div>
          <div className="fd-spine-labels">
            {workflow.phases.map((p) => {
              const isCurrent = p === state.current;
              const isCompleted = state.completed.includes(p);
              return (
                <span
                  key={p}
                  className={isCurrent ? 'current' : isCompleted ? 'done' : ''}
                  onClick={() => onLabelClick(p)}
                  title={`Go to ${p}`}>
                  {p}
                </span>
              );
            })}
          </div>
        </div>

        <div className="fd-spine-side">
          <span className="fd-spine-pct">{completedPct}%</span>
          {!isDelivered ? (
            <button type="button" className="fd-spine-deliver" onClick={markDelivered}>
              Mark delivered
            </button>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--sage)', fontWeight: 600 }}>✓ Delivered</span>
          )}
        </div>
      </div>
    </div>
  );
}
