'use client';
// File detail layout — header, breadcrumbs, tab bar.
// Children render the currently-active tab page.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { use } from 'react';
import { notFound } from 'next/navigation';
import { Crumb } from '@/app/_components/Crumb';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useTemplates } from '@/app/_lib/templates-store';

const TABS = [
  { seg: 'conversation', en: 'Conversation', heb: 'שיחה' },
  { seg: 'documents',    en: 'Documents',    heb: 'מסמכים' },
  { seg: 'sources',      en: 'Sources',      heb: 'מקורות' },
  { seg: 'insights',     en: 'Insights',     heb: 'ניצוצות' },
  { seg: 'draft',        en: 'Draft',        heb: 'טיוטה' },
  { seg: 'final',        en: 'Final',        heb: 'סופי' },
];

export default function FileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const pathname = usePathname();
  const { encounters, loading } = useEncounters();
  const { getById: getTemplate } = useTemplates();

  if (loading) {
    return <div className="mono" style={{ color: 'var(--ink-3)' }}>Loading...</div>;
  }

  const file = encounters.find((e) => e.id === id);
  if (!file) return notFound();

  const typeInfo = getTemplate(file.type);

  return (
    <>
      <Crumb items={[{ href: '/files', label: 'Files' }, { label: file.congregantName }]} />

      <div className="file-detail-head">
        <div>
          <div className="page-eyebrow">{typeInfo?.en || file.topic || 'Encounter'}</div>
          <h1 className="file-detail-title">{typeInfo?.heb || ''}</h1>
          <div className="file-detail-en">{file.congregantName}</div>
          <div className="file-detail-meta-row">
            <span>{file.date}</span>
          </div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((tab) => {
          const href = `/files/${id}/${tab.seg}`;
          const active = pathname === href;
          const count = tab.seg === 'sources' ? file.sources?.length : undefined;
          return (
            <Link key={tab.seg} href={href} className={`tab ${active ? 'active' : ''}`}>
              <span className="en">{tab.en}</span>
              {count ? <span className="count">{count}</span> : null}
            </Link>
          );
        })}
      </div>

      {children}
    </>
  );
}
