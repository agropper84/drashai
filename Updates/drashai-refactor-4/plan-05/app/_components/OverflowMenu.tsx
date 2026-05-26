'use client';
// Plan 5 — cleaner discriminator. `MenuItem` no longer carries a `divider`
// property; dividers are a separate union member. Authors get sharp errors when
// they pass malformed items.

import { ReactNode, useEffect, useRef, useState } from 'react';

export interface MenuItem {
  label: string;
  hint?: string;
  destructive?: boolean;
  icon?: ReactNode;
  onSelect: () => void;
}

export interface MenuDivider { divider: true }

export type MenuEntry = MenuItem | MenuDivider;

const isDivider = (e: MenuEntry): e is MenuDivider => 'divider' in e && e.divider === true;

export function OverflowMenu({
  items,
  trigger,
  align = 'right',
}: {
  items: MenuEntry[];
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
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
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
            <circle cx="6" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18" cy="12" r="1.5"/>
          </svg>
        )}
      </button>
      {open && (
        <div
          className="overflow-menu"
          role="menu"
          style={align === 'left' ? { left: 0, right: 'auto' } : undefined}>
          {items.map((it, i) =>
            isDivider(it) ? (
              <div key={i} className="overflow-menu-divider"/>
            ) : (
              <button
                key={i}
                type="button"
                role="menuitem"
                className={'overflow-menu-item' + (it.destructive ? ' destructive' : '')}
                onClick={() => { setOpen(false); it.onSelect(); }}>
                {it.icon && <span className="overflow-menu-icon">{it.icon}</span>}
                <span className="overflow-menu-label">{it.label}</span>
                {it.hint && <span className="overflow-menu-hint">{it.hint}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
