'use client';
// A tiny pill in the file detail header that shows the workflow as 5 dots.
// Clicking expands the full CollapsibleSpine below the header.

import type { Workflow } from '@/app/_lib/types';

export interface HeaderProgressPillProps {
  workflow: Workflow;
  current: string;
  completed: string[];
  open: boolean;
  onClick: () => void;
}

export function HeaderProgressPill({ workflow, current, completed, open, onClick }: HeaderProgressPillProps) {
  return (
    <button className={`fd-progress-pill${open ? ' open' : ''}`} onClick={onClick} type="button">
      <span className="fd-progress-dots">
        {workflow.phases.map((p) => (
          <span
            key={p}
            className={p === current ? 'current' : completed.includes(p) ? 'done' : ''}
          />
        ))}
      </span>
      <span>{open ? 'Hide' : 'Progress'}</span>
    </button>
  );
}
