'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/studyo', icon: '◫', label: 'Projects' },
  { href: '/studyo/library', icon: '≣', label: 'All audio files' },
  { href: '/studyo/voices', icon: '♪', label: 'Voices' },
];

export function StudyoSidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/studyo') return pathname === '/studyo' || pathname.startsWith('/studyo/projects');
    return pathname.startsWith(href);
  };

  const initials = userName
    ? userName.split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase()
    : 'ST';

  return (
    <aside className="sy-sidebar">
      <div className="sy-brand">
        <div className="sy-brand-mark">◗</div>
        <div>
          <div className="sy-brand-name">Studyo</div>
          <div className="sy-brand-sub">Study by ear</div>
        </div>
      </div>

      <nav className="sy-nav">
        {NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sy-nav-item${isActive(item.href) ? ' active' : ''}`}
          >
            <span className="sy-nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <Link href="/studyo?new=1" className="sy-new-project">
        + New project
      </Link>

      <div className="sy-sidebar-stat">
        <div className="sy-sidebar-stat-text">
          <span style={{ color: '#D49A5A' }}>●</span> 0h 0m this week<br/>across 0 sessions
        </div>
        <div className="sy-sidebar-user">
          <div className="sy-user-avatar">{initials}</div>
          <div className="sy-user-name">{userName || 'Student'}</div>
        </div>
      </div>
    </aside>
  );
}
