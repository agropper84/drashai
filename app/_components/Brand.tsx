'use client';
// Sidebar brand mark with Hebrew initials. Plan 9 will replace the cute initials
// mapping with a single logo glyph — for now it's preserved as-is from old page.tsx.

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
