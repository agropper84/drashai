// Pure heuristics — given an encounter + a workflow, return the *suggested*
// current phase and the set of *auto-completed* phases. User overrides take
// priority and are merged on top.

import type { Encounter, Workflow } from './types';

export interface PhaseState {
  /** The phase to display as "current" on the spine. */
  current: string;
  /** All phases that should be drawn as done — auto + user. */
  completed: string[];
}

/**
 * Compute auto-completed phases by inspecting the encounter.
 * Returns indexes (into workflow.phases) that are observable as done.
 */
function autoCompletedIndexes(enc: Encounter, workflow: Workflow): number[] {
  const last = workflow.phases.length - 1;
  const idx: number[] = [];

  // 0 — Meeting / start state: always done after creation.
  if (workflow.phases.length > 0) idx.push(0);

  // 1 — Record. Transcript present (>100 chars).
  if (workflow.phases.length > 1 && (enc.transcript?.length ?? 0) > 100) {
    idx.push(1);
  }

  // 2 — Source. Any source attached.
  if (workflow.phases.length > 2 && (enc.sources?.length ?? 0) > 0) {
    idx.push(2);
  }

  // 3 — Draft. Any generated content (or a sizable user draft if you store one).
  if (workflow.phases.length > 3 && (enc.generatedContent?.length ?? 0) > 0) {
    idx.push(3);
  }

  // last — Deliver. Only via explicit user action (completedPhases includes it).
  if (last >= 0 && (enc.completedPhases || []).includes(workflow.phases[last])) {
    idx.push(last);
  }

  return idx;
}

export function derivePhaseState(enc: Encounter, workflow: Workflow): PhaseState {
  if (workflow.phases.length === 0) return { current: '', completed: [] };

  const autoIdx = autoCompletedIndexes(enc, workflow);
  const userCompleted = enc.completedPhases || [];
  const userIdx = userCompleted
    .map((p) => workflow.phases.indexOf(p))
    .filter((i) => i >= 0);

  const completedIdx = Array.from(new Set([...autoIdx, ...userIdx])).sort((a, b) => a - b);
  const completed = completedIdx.map((i) => workflow.phases[i]);

  // Current = the FIRST phase that isn't done, or the LAST phase if everything's done.
  // User override: if enc.phase is set AND not "done", it wins.
  const allDone = completedIdx.length === workflow.phases.length;
  if (allDone) {
    return { current: workflow.phases[workflow.phases.length - 1], completed };
  }

  const userOverride = enc.phase && workflow.phases.includes(enc.phase) && !completed.includes(enc.phase);
  if (userOverride && enc.phase) {
    return { current: enc.phase, completed };
  }

  // Otherwise: walk forward to the first not-done index.
  let i = 0;
  while (i < workflow.phases.length && completedIdx.includes(i)) i++;
  const current = workflow.phases[Math.min(i, workflow.phases.length - 1)];
  return { current, completed };
}

/**
 * Given a phase name and a workflow's phaseTabMap, return the tab slug to navigate to.
 * Falls back to a sensible default based on phase position.
 */
export function tabForPhase(
  phase: string,
  workflow: Workflow,
): 'conversation' | 'documents' | 'sources' | 'insights' | 'draft' | 'final' {
  const explicit = workflow.phaseTabMap?.[phase];
  if (explicit) return explicit;

  // Heuristic fallback by phase index.
  const i = workflow.phases.indexOf(phase);
  const last = workflow.phases.length - 1;
  if (i <= 0) return 'conversation';
  if (i === 1) return 'conversation';
  if (i === 2) return 'sources';
  if (i === last) return 'final';
  return 'draft';
}
