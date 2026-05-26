'use client';
// Plan 5 — split dot and label handlers so the file detail can navigate on
// label click and toggle on dot click. Cards keep their single `onToggle`
// (dot AND label both call it), which preserves their current behavior.

import { Fragment } from 'react';

export interface StatusSpineProps {
  phases: string[];
  current: string;
  completed?: string[];
  compact?: boolean;
  size?: 'md' | 'lg';
  /** When set: dot click AND label click both call this. (Use for cards.) */
  onToggle?: (phase: string) => void;
  /** When set: overrides onToggle for the dot only. (Use for detail spine.) */
  onDotClick?: (phase: string) => void;
  /** When set: overrides onToggle for the label only. (Use for detail spine.) */
  onLabelClick?: (phase: string) => void;
}

const DOT_SIZE_MD = { current: 11, default: 7 };
const DOT_SIZE_LG = { current: 18, default: 11 };

export function StatusSpine({
  phases, current, completed = [], compact = false, size = 'md',
  onToggle, onDotClick, onLabelClick,
}: StatusSpineProps) {
  const curIdx = phases.indexOf(current);
  const isDone = (i: number) => completed.includes(phases[i]) || i < curIdx;
  const DOT = size === 'lg' ? DOT_SIZE_LG : DOT_SIZE_MD;
  const labelSize = size === 'lg' ? 11 : 9;

  const dotHandler = onDotClick ?? onToggle;
  const labelHandler = onLabelClick ?? onToggle;
  const dotInteractive = !!dotHandler;
  const labelInteractive = !!labelHandler;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? 0 : (size === 'lg' ? 8 : 4) }}>
      <div className="spine-row">
        {phases.map((p, i) => {
          const current = i === curIdx;
          const done = isDone(i);
          const cls = current ? 'spine-dot current' : done ? 'spine-dot done' : 'spine-dot';
          const dotPx = current ? DOT.current : DOT.default;
          return (
            <Fragment key={p}>
              {dotInteractive ? (
                <button
                  type="button"
                  className={cls}
                  style={{ width: dotPx, height: dotPx, padding: 0 }}
                  title={`Toggle "${p}"`}
                  onClick={(e) => { e.stopPropagation(); dotHandler?.(p); }}
                />
              ) : (
                <span className={cls} style={{ width: dotPx, height: dotPx, display: 'inline-block' }} />
              )}
              {i < phases.length - 1 && <div className={'spine-line' + (done ? ' done' : '')} />}
            </Fragment>
          );
        })}
      </div>
      {!compact && (
        <div className="spine-labels" style={{ fontSize: labelSize }}>
          {phases.map((p, i) => (
            <span
              key={p}
              className={i === curIdx ? 'current' : isDone(i) ? 'done' : ''}
              onClick={labelInteractive ? (e) => { e.stopPropagation(); labelHandler?.(p); } : undefined}
              title={onLabelClick ? `Go to ${p}` : undefined}
              style={{
                textAlign: i === 0 ? 'left' : i === phases.length - 1 ? 'right' : 'center',
                cursor: labelInteractive ? 'pointer' : 'default',
              }}>
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
