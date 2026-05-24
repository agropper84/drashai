'use client';
import Link from 'next/link';
import type { ReactNode } from 'react';

interface CrumbItem {
  href?: string;
  label: ReactNode;
}

export function Crumb({ items }: { items: CrumbItem[] }) {
  return (
    <div className="crumb">
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {it.href ? <Link href={it.href}>{it.label}</Link> : <span>{it.label}</span>}
          {i < items.length - 1 && <span className="crumb-sep">›</span>}
        </span>
      ))}
    </div>
  );
}
