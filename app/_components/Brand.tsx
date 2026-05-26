'use client';
// Brand component — calligraphic quill-dalet logo (Option A: wet ink).
// Used in the sidebar and login page.

/** Calligraphic quill SVG — the dalet as a scribe's feather with ink bead. */
export function QuillLogo({ size = 36, inverted = false }: { size?: number; inverted?: boolean }) {
  const quill = inverted ? '#f0e7d2' : '#7a2e2a';
  const ink = inverted ? '#d9b46a' : '#a87a2c';
  const slit = inverted ? '#7a2e2a' : '#f0e7d2';

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Drashai">
      {/* Feather — broad calamus tapering right */}
      <path d="M 8 22 C 28 16, 60 17, 84 24 C 88 28, 82 32, 70 33 L 22 31 C 12 30, 8 26, 8 22 Z" fill={quill}/>
      {/* Shaft — thick-thin chisel-nib stroke */}
      <path d="M 73 32 L 84 32 L 80 70 L 76 86 Q 72 95, 68 86 L 65 70 Z" fill={quill}/>
      {/* Nib slit */}
      {size >= 32 && (
        <line x1="74.5" y1="78" x2="74.5" y2="88" stroke={slit} strokeWidth="1" strokeLinecap="round"/>
      )}
      {/* Wet ink bead */}
      <circle cx="74.5" cy="93" r="2.6" fill={ink}/>
    </svg>
  );
}

const HEB_MAP: Record<string, string> = {
  A:'א', B:'ב', C:'כ', D:'ד', E:'א', F:'פ', G:'ג', H:'ה', I:'י', J:'י',
  K:'כ', L:'ל', M:'מ', N:'נ', O:'ע', P:'פ', Q:'ק', R:'ר', S:'ש', T:'ת',
  U:'א', V:'ו', W:'ו', X:'כ', Y:'י', Z:'ז',
};

export function hebrewInitials(name: string): string {
  if (!name) return 'דא';
  const parts = name.trim().split(/\s+/);
  const first = (parts[0]?.[0] || '').toUpperCase();
  const last  = (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] || '').toUpperCase();
  return (HEB_MAP[first] || 'א') + (HEB_MAP[last] || 'א');
}

export function Brand({ userName }: { userName: string }) {
  return (
    <div className="brand">
      <div className="brand-mark">{hebrewInitials(userName) || 'דא'}</div>
      <div className="nav-label">
        <div className="brand-name heb-display" style={{ fontSize: 24 }}>דרשאי</div>
        <div className="brand-sub" style={{ textTransform: 'none', letterSpacing: '0.04em' }}>drashai</div>
      </div>
    </div>
  );
}
