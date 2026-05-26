'use client';
// Plan 4 — adds FileDetailSpine between the header and tabs.

import Link from 'next/link';
import { use } from 'react';
import { notFound, usePathname } from 'next/navigation';
import { Crumb } from '@/app/_components/Crumb';
import { TaskRail } from '@/app/_components/files/TaskRail';
import { FileDetailSpine } from '@/app/_components/files/FileDetailSpine';
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

  if (loading) return <div className="mono" style={{ color: 'var(--ink-3)' }}>Loading...</div>;
  const file = encounters.find((e) => e.id === id);
  if (!file) return notFound();

  const tpl = getTemplate(file.type);

  return (
    <>
      <Crumb items={[{ href: '/files', label: 'Files' }, { label: file.subject || file.congregantName }]} />

      <div className="detail-with-rail">
        <div>
          <div className="file-detail-head">
            <div>
              <div className="page-eyebrow">{tpl?.en || file.topic || 'Encounter'} · {file.date}</div>
              <h1 className="file-detail-title">{file.subject || file.congregantName}</h1>
              {file.subjectHeb && (
                <div className="file-detail-en" style={{ fontFamily: 'Frank Ruhl Libre, serif', direction: 'rtl' }}>
                  {file.subjectHeb}
                </div>
              )}
              <div className="file-detail-en">{file.congregantName}</div>
              {file.nextEvent && (
                <div className="file-detail-meta-row">
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{file.nextEvent}</span>
                  {file.nextEventRel && (
                    <>
                      <span className="crumb-sep">·</span>
                      <span>{file.nextEventRel}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <FileDetailSpine file={file}/>

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
        </div>

        <TaskRail file={file}/>
      </div>
    </>
  );
}
