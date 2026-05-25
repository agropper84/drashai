'use client';
// Generic dropdown menu — used on file cards and (optionally) elsewhere.
// Anchored to the trigger button; closes on outside click, ESC, or selection.

import { ReactNode, useEffect, useRef, useState } from 'react';

export interface MenuItem {
  label: string;
  /** Optional short hint right-aligned in the row (e.g. "⌘D"). */
  hint?: string;
  /** Render as destructive (red text). */
  destructive?: boolean;
  /** Icon left of the label. */
  icon?: ReactNode;
  onSelect: () => void;
  /** Display only — not clickable. */
  divider?: boolean;
}

export function OverflowMenu({
  items,
  trigger,
  align = 'right',
}: {
  items: (MenuItem | { divider: true })[];
  trigger?: ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="overflow-menu-wrap" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="icon-btn"
        style={{ width: 24, height: 24 }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}>
        {trigger ?? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="6" cy="12" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="18" cy="12" r="1.5"/>
          </svg>
        )}
      </button>
      {open && (
        <div
          className="overflow-menu"
          role="menu"
          style={align === 'left' ? { left: 0, right: 'auto' } : undefined}>
          {items.map((it, i) =>
            'divider' in it && it.divider ? (
              <div key={i} className="overflow-menu-divider"/>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                className={'overflow-menu-item' + ((it as MenuItem).destructive ? ' destructive' : '')}
                onClick={() => {
                  setOpen(false);
                  (it as MenuItem).onSelect();
                }}>
                {(it as MenuItem).icon && <span className="overflow-menu-icon">{(it as MenuItem).icon}</span>}
                <span className="overflow-menu-label">{(it as MenuItem).label}</span>
                {(it as MenuItem).hint && <span className="overflow-menu-hint">{(it as MenuItem).hint}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
