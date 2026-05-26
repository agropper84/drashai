'use client';
// Plan 5 — uses useActiveFile (D5). Otherwise identical to Plan 4 layout.

import Link from 'next/link';
import { notFound, usePathname } from 'next/navigation';
import { Crumb } from '@/app/_components/Crumb';
import { TaskRail } from '@/app/_components/files/TaskRail';
import { FileDetailSpine } from '@/app/_components/files/FileDetailSpine';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useTemplates } from '@/app/_lib/templates-store';

const TABS = [
  { seg: 'conversation', en: 'Conversation', heb: 'שיחה' },
  { seg: 'documents',    en: 'Documents',    heb: 'מסמכים' },
  { seg: 'sources',      en: 'Sources',      heb: 'מקורות' },
  { seg: 'insights',     en: 'Insights',     heb: 'ניצוצות' },
  { seg: 'draft',        en: 'Draft',        heb: 'טיוטה' },
  { seg: 'final',        en: 'Final',        heb: 'סופי' },
];

export default function FileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { id, file, loading } = useActiveFile();
  const { getById: getTemplate } = useTemplates();

  if (loading) return <div className="mono" style={{ color: 'var(--ink-3)' }}>Loading...</div>;
  if (!file || !id) return notFound();

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
