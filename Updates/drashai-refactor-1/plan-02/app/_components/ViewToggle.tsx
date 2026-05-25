'use client';
import type { CardView } from '@/app/_lib/types';

const DetailedIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5h18M3 9h18M3 13h12M3 17h12M3 21h7"/>
  </svg>
);

const MinimalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>
  </svg>
);

export function ViewToggle({ value, onChange }: { value: CardView; onChange: (v: CardView) => void }) {
  return (
    <div className="view-toggle" role="tablist" aria-label="Card view">
      <button
        type="button"
        className={value === 'detailed' ? 'active' : ''}
        onClick={() => onChange('detailed')}
        title="Detailed view (V3) — status spine, sources, drafts">
        <DetailedIcon/> Detailed
      </button>
      <button
        type="button"
        className={value === 'minimal' ? 'active' : ''}
        onClick={() => onChange('minimal')}
        title="Minimal view (V4) — sealed letter, just the essentials">
        <MinimalIcon/> Minimal
      </button>
    </div>
  );
}
