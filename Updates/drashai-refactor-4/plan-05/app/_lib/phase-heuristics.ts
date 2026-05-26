// Plan 5 — adds isWorkflowDone helper (D12). Otherwise identical to Plan 4.

import type { Encounter, Workflow, FileTab } from './types';

export interface PhaseState {
  current: string;
  completed: string[];
}

function autoCompletedIndexes(enc: Encounter, workflow: Workflow): number[] {
  const last = workflow.phases.length - 1;
  const idx: number[] = [];
  if (workflow.phases.length > 0) idx.push(0);
  if (workflow.phases.length > 1 && (enc.transcript?.length ?? 0) > 100) idx.push(1);
  if (workflow.phases.length > 2 && (enc.sources?.length ?? 0) > 0) idx.push(2);
  if (workflow.phases.length > 3 && (enc.generatedContent?.length ?? 0) > 0) idx.push(3);
  if (last >= 0 && (enc.completedPhases || []).includes(workflow.phases[last])) idx.push(last);
  return idx;
}

export function derivePhaseState(enc: Encounter, workflow: Workflow): PhaseState {
  if (workflow.phases.length === 0) return { current: '', completed: [] };

  const autoIdx = autoCompletedIndexes(enc, workflow);
  const userCompleted = enc.completedPhases || [];
  const userIdx = userCompleted.map((p) => workflow.phases.indexOf(p)).filter((i) => i >= 0);
  const completedIdx = Array.from(new Set([...autoIdx, ...userIdx])).sort((a, b) => a - b);
  const completed = completedIdx.map((i) => workflow.phases[i]);

  const allDone = completedIdx.length === workflow.phases.length;
  if (allDone) return { current: workflow.phases[workflow.phases.length - 1], completed };

  const userOverride = enc.phase && workflow.phases.includes(enc.phase) && !completed.includes(enc.phase);
  if (userOverride && enc.phase) return { current: enc.phase, completed };

  let i = 0;
  while (i < workflow.phases.length && completedIdx.includes(i)) i++;
  const current = workflow.phases[Math.min(i, workflow.phases.length - 1)];
  return { current, completed };
}

/** Plan 5 — single source of truth for "is everything done?" */
export function isWorkflowDone(state: PhaseState, workflow: Workflow): boolean {
  if (workflow.phases.length === 0) return false;
  const last = workflow.phases[workflow.phases.length - 1];
  return state.completed.includes(last);
}

export function tabForPhase(phase: string, workflow: Workflow): FileTab {
  const explicit = workflow.phaseTabMap?.[phase];
  if (explicit) return explicit;
  const i = workflow.phases.indexOf(phase);
  const last = workflow.phases.length - 1;
  if (i <= 0) return 'conversation';
  if (i === 1) return 'conversation';
  if (i === 2) return 'sources';
  if (i === last) return 'final';
  return 'draft';
}
