'use client';
// Bottom tab bar for mobile (<640px). Replaces sidebar navigation.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { I } from './Icons';
import { useRecordingSession } from './recording/RecordingProvider';

const TABS = [
  { href: '/files',     icon: I.home,     label: 'Files' },
  { href: '/sparks',    icon: I.spark,    label: 'Sparks' },
  { href: '/templates', icon: I.templ,    label: 'Templates' },
  { href: '/library',   icon: I.book,     label: 'Library' },
  { href: '/settings',  icon: I.settings, label: 'Settings' },
];

export function MobileTabs() {
  const pathname = usePathname();
  const rec = useRecordingSession();
  const isRecording = !!rec.session?.fileId;

  const isActive = (href: string) => {
    if (href === '/files') return pathname === '/files' || pathname.startsWith('/files/');
    return pathname.startsWith(href);
  };

  return (
    <nav className="mobile-tabs">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`mobile-tab${isActive(tab.href) ? ' active' : ''}`}
        >
          <span className="mobile-tab-icon">
            {tab.icon}
            {tab.href === '/files' && isRecording && (
              <span className="mobile-tab-rec" />
            )}
          </span>
          <span className="mobile-tab-label">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
