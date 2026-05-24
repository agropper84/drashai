'use client';
// Sidebar. Uses Next's usePathname() for active state — no more `view` useState.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { I } from './Icons';
import { Brand } from './Brand';
import { useEncounters } from '@/app/_lib/encounters-store';

const ITEMS = [
  { href: '/files',     icon: I.home,     en: 'Files',     heb: 'תיקים' },
  { href: '/sparks',    icon: I.spark,    en: 'Sparks',    heb: 'ניצוצות' },
  { href: '/templates', icon: I.templ,    en: 'Templates', heb: 'תבניות' },
  { href: '/library',   icon: I.book,     en: 'Library',   heb: 'ספרייה' },
  { href: '/settings',  icon: I.settings, en: 'Settings',  heb: 'הגדרות' },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const { encounters } = useEncounters();

  const isActive = (href: string) => {
    if (href === '/files') return pathname === '/files';
    return pathname.startsWith(href);
  };

  return (
    <aside className="sidebar">
      <Brand userName={userName} />

      <div className="nav-section">Workspace</div>

      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nav-item ${isActive(item.href) ? 'active' : ''}`}>
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">
            <span className="en">{item.en}</span>
            <span className="heb">{item.heb}</span>
          </span>
        </Link>
      ))}

      {encounters.length > 0 && (
        <>
          <div className="nav-section" style={{ marginTop: 12 }}>Recent</div>
          {encounters.slice(0, 3).map((enc) => (
            <Link
              key={enc.id}
              href={`/files/${enc.id}`}
              className={`nav-item ${pathname.startsWith(`/files/${enc.id}`) ? 'active' : ''}`}>
              <span className="nav-icon">{I.scroll}</span>
              <span className="nav-label">
                <span className="en" style={{ fontSize: 13 }}>{enc.congregantName}</span>
                <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{enc.topic || enc.date}</span>
              </span>
            </Link>
          ))}
        </>
      )}

      <div className="sidebar-foot">
        <a href="/api/auth/logout" className="nav-item" style={{ color: 'var(--ink-3)' }}>
          <span className="nav-icon">{I.logout}</span>
          <span className="nav-label"><span className="en">Sign Out</span></span>
        </a>
      </div>
    </aside>
  );
}
