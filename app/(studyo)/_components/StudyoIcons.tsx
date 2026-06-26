'use client';
// Studyo monoline icon set — replaces stray emoji/text glyphs with consistent SVGs.
// Usage: <Icon name="audio" size={20} stroke="#D49A5A" />

import type { CSSProperties } from 'react';

// Each entry is an array of <path d> strings (all stroked, no fill) unless noted.
const PATHS: Record<string, string[]> = {
  // material / source types
  pdf: ['M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z', 'M14 3v6h6', 'M8 14h8', 'M8 17.5h5'],
  text: ['M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z', 'M8 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2', 'M8 12h8', 'M8 16h5'],
  link: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'],
  media: ['M4 6h12a1 1 0 0 1 1 1v3l4-2.5v9L17 14v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z'],
  // output kinds
  audio: ['M12 4a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3z', 'M6 11a6 6 0 0 0 12 0', 'M12 17v3', 'M9 20h6'],
  transcript: ['M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z', 'M14 3v6h6', 'M8 13h8', 'M8 17h6'],
  notes: ['M8 6h12', 'M8 12h12', 'M8 18h10', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
  questions: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7', 'M12 17h.01'],
  extract: ['M4 6h12a1 1 0 0 1 1 1v3l4-2.5v9L17 14v3a1 1 0 0 1-1 1h-5', 'M4 6a1 1 0 0 0-1 1v3', 'M7 16v6', 'M4.5 19.5 7 22l2.5-2.5'],
  // actions
  upload: ['M12 15V4', 'M8 8l4-4 4 4', 'M5 20h14'],
  paste: ['M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z', 'M8 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2'],
  edit: ['M12 20h9', 'M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'],
  trash: ['M4 7h16', 'M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2', 'M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13', 'M10 11v6', 'M14 11v6'],
  plus: ['M12 5v14', 'M5 12h14'],
  check: ['M5 12l5 5 9-11'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  back: ['M15 5l-7 7 7 7'],
  external: ['M14 5h5v5', 'M19 5l-8 8', 'M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4'],
  // playback (preview)
  play: ['M8 5v14l11-7z'],
  pause: ['M9 5v14', 'M15 5v14'],
};

// Filled icons (use fill instead of stroke)
const FILLED = new Set(['play']);

export interface IconProps {
  name: keyof typeof PATHS | string;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
}

export function Icon({ name, size = 18, stroke = 'currentColor', strokeWidth = 1.7, style, className }: IconProps) {
  const paths = PATHS[name];
  if (!paths) return null;
  const filled = FILLED.has(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? stroke : 'none'}
      stroke={filled ? 'none' : stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

// The "sparkle" / generate mark (4-point star) — kept separate so it can be filled cleanly.
export function Sparkle({ size = 14, color = 'currentColor', style }: { size?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={style} aria-hidden="true" focusable="false">
      <path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z" />
    </svg>
  );
}
