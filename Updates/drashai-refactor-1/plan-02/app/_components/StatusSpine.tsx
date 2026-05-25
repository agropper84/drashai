'use client';
// Interactive workflow status spine. Click any dot or label to toggle completion.
// Used on cards (compact + labeled forms) and (Plan 4) on the file detail header.

import { Fragment } from 'react';

export interface StatusSpineProps {
  /** Ordered phase labels (typically from Workflow.phases). */
  phases: string[];
  /** The current/active phase label. */
  current: string;
  /** Phases explicitly marked complete by the user. */
  completed?: string[];
  /** Compact = no labels under the dots (for V5 stripe / Plan 4 inline use). */
  compact?: boolean;
  /** When provided, dots and labels become clickable. */
  onToggle?: (phase: string) => void;
}

export function StatusSpine({ phases, current, completed = [], compact = false, onToggle }: StatusSpineProps) {
  const curIdx = phases.indexOf(current);
  const isDone = (i: number) => completed.includes(phases[i]) || i < curIdx;
  const interactive = !!onToggle;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 0 : 4 }}>
      <div className="spine-row">
        {phases.map((p, i) => {
          const current = i === curIdx;
          const done = isDone(i);
          const cls = current ? 'spine-dot current' : done ? 'spine-dot done' : 'spine-dot';
          const size = current ? 11 : 7;
          return (
            <Fragment key={p}>
              {interactive ? (
                <button
                  type="button"
                  className={cls}
                  style={{ width: size, height: size, padding: 0 }}
                  title={`Toggle "${p}"`}
                  onClick={(e) => { e.stopPropagation(); onToggle?.(p); }}
                />
              ) : (
                <span className={cls} style={{ width: size, height: size, display: 'inline-block' }}/>
              )}
              {i < phases.length - 1 && (
                <div className={'spine-line' + (done ? ' done' : '')} />
              )}
            </Fragment>
          );
        })}
      </div>
      {!compact && (
        <div className="spine-labels">
          {phases.map((p, i) => (
            <span
              key={p}
              className={i === curIdx ? 'current' : isDone(i) ? 'done' : ''}
              onClick={interactive ? (e) => { e.stopPropagation(); onToggle?.(p); } : undefined}
              style={{
                textAlign: i === 0 ? 'left' : i === phases.length - 1 ? 'right' : 'center',
                cursor: interactive ? 'pointer' : 'default',
              }}>
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
