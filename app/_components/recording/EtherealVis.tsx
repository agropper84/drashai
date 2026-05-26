'use client';
// A subtle, slow concentric breathing animation. Center dot pulses softly;
// three outer rings expand at 8s intervals with phase offsets so the motion
// is continuous but never sharp. Reduced-motion users get a steady glow.

export interface EtherealVisProps {
  /** Diameter in px. 32 for bar, 96 for modal, 160 for review. */
  size?: number;
  /** 0..1 — gentle modulation of center-dot alpha. Defaults to 1. */
  level?: number;
  /** When true, all animation freezes (paused). */
  paused?: boolean;
}

export function EtherealVis({ size = 96, level = 1, paused = false }: EtherealVisProps) {
  // Clamp + soften level so quiet rooms still glow.
  const alpha = 0.55 + Math.min(Math.max(level, 0), 1) * 0.45;

  return (
    <div
      className={`ethereal-vis${paused ? ' paused' : ''}`}
      style={{ width: size, height: size }}>
      <div className="ethereal-ring r1" />
      <div className="ethereal-ring r2" />
      <div className="ethereal-ring r3" />
      <div
        className="ethereal-dot"
        style={{ opacity: alpha, transition: 'opacity 240ms ease' }}
      />
    </div>
  );
}
