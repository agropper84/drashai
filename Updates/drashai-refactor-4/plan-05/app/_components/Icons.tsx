// Plan 5 — adds template-specific glyphs used by the sidebar Recent list.

import type { ReactNode } from 'react';

const baseProps = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const svg = (children: ReactNode): ReactNode => (
  <svg viewBox="0 0 24 24" {...baseProps}>{children}</svg>
);

export const I = {
  home:     svg(<><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M9 21V12h6v9"/></>),
  scroll:   svg(<><path d="M8 21h12a2 2 0 002-2V7a2 2 0 00-2-2H8"/><path d="M4 3h4v18H4a2 2 0 01-2-2V5a2 2 0 012-2z"/></>),
  settings: svg(<><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>),
  mic:      svg(<><rect x="9" y="1" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 01-14 0v-1"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>),
  plus:     svg(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>),
  x:        svg(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>),
  back:     svg(<polyline points="15 18 9 12 15 6"/>),
  lock:     svg(<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>),
  copy:     svg(<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>),
  check:    svg(<polyline points="20 6 9 17 4 12"/>),
  trash:    svg(<><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6m4-6v6"/></>),
  logout:   svg(<><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>),
  spark:    svg(<path d="M12 2L9 12l-7 1 5.5 5L6 22l6-4 6 4-1.5-4L22 13l-7-1z"/>),
  book:     svg(<><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></>),
  templ:    svg(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></>),
  doc:      svg(<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></>),
  pause:    svg(<><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>),
  play:     svg(<polygon points="5 3 19 12 5 21 5 3"/>),
  stop:     svg(<rect x="4" y="4" width="16" height="16" rx="2"/>),
  search:   svg(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>),
  pin:      svg(<><path d="M12 17v5M5 17h14l-1.5-6.5a1 1 0 00-1-.5H7.5a1 1 0 00-1 .5z"/><path d="M15 4L9 4l-1 6h8z"/></>),
  share:    svg(<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></>),
  print:    svg(<><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></>),

  // Plan 5 — per-template glyphs for the sidebar Recent list
  candle:   svg(<><path d="M12 2v3M10 5h4v3a2 2 0 01-2 2 2 2 0 01-2-2zM8 10h8v10a1 1 0 01-1 1H9a1 1 0 01-1-1z"/></>),
  rings:    svg(<><circle cx="9" cy="14" r="5"/><circle cx="15" cy="14" r="5"/><path d="M9 5l3 3 3-3"/></>),
  envelope: svg(<><rect x="3" y="6" width="18" height="14" rx="1"/><path d="M3 7l9 7 9-7"/></>),
  star:     svg(<polygon points="12 3 14.5 9 21 9.5 16 14 17.5 21 12 17.5 6.5 21 8 14 3 9.5 9.5 9"/>),
} as const;

/**
 * Plan 5 — given a template id (workflow → template), return the right glyph
 * for the sidebar Recent list.
 */
export function iconForType(type?: string): ReactNode {
  switch (type) {
    case 'hesped':      return I.candle;
    case 'wedding':     return I.rings;
    case 'letter':      return I.envelope;
    case 'bar_mitzvah': return I.star;
    case 'drasha':
    case 'dvar_torah':
    case 'study':
    default:            return I.scroll;
  }
}
