'use client';
// Plan 11 — clean, calm header. Workflow spine is hidden behind a Progress
// pill. Tasks live in a floating corner pill. Documents tab stays.

import Link from 'next/link';
import { useState } from 'react';
import { notFound, usePathname } from 'next/navigation';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useWorkflows } from '@/app/_lib/workflows-store';
import { derivePhaseState } from '@/app/_lib/phase-heuristics';
import { HeaderProgressPill } from '@/app/_components/files/HeaderProgressPill';
import { CollapsibleSpine } from '@/app/_components/files/CollapsibleSpine';
import { TasksPill } from '@/app/_components/files/TasksPill';

const TABS = [
  { seg: 'conversation', en: 'Conversation' },
  { seg: 'documents',    en: 'Documents' },
  { seg: 'sources',      en: 'Sources' },
  { seg: 'draft',        en: 'Draft' },
  { seg: 'final',        en: 'Final' },
];

export default function FileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { id, file, loading } = useActiveFile();
  const { getEffectiveWorkflow } = useWorkflows();
  const [spineOpen, setSpineOpen] = useState(false);

  if (loading) return <div className="mono" style={{ color: 'var(--ink-3)' }}>Loading...</div>;
  if (!file || !id) return notFound();

  const workflow = getEffectiveWorkflow(file);
  const phaseState = derivePhaseState(file, workflow);
  const subject = file.subject || file.congregantName;

  return (
    <>
      <div className="fd-page">
        <div className="fd-crumb">
          <Link href="/files">Files</Link>
          <span className="fd-crumb-sep">›</span>
          <span className="fd-crumb-current">{subject}</span>
        </div>

        <div className="fd-header">
          <div className="fd-title-block">
            <h1 className="fd-title">{subject}</h1>
            {file.subjectHeb && <div className="fd-title-heb">{file.subjectHeb}</div>}
          </div>

          <div className="fd-aside">
            {file.nextEvent && (
              <div className="fd-next">
                <div className="fd-next-label">{file.type || 'Encounter'}</div>
                <div className="fd-next-event">{file.nextEvent}</div>
                {file.nextEventRel && <div className="fd-next-rel">{file.nextEventRel}</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <HeaderProgressPill
                workflow={workflow}
                current={phaseState.current}
                completed={phaseState.completed}
                open={spineOpen}
                onClick={() => setSpineOpen((v) => !v)}
              />
              {file.sealed && (
                <span className="badge sealed" style={{ fontSize: 9, padding: '3px 7px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  Sealed
                </span>
              )}
            </div>
          </div>
        </div>

        <CollapsibleSpine file={file} open={spineOpen}/>

        <div className="fd-tabs">
          {TABS.map((tab) => {
            const href = `/files/${id}/${tab.seg}`;
            const active = pathname === href;
            const count =
              tab.seg === 'sources' ? file.sources?.length :
              tab.seg === 'documents' ? undefined : // hook up doc count when you wire it
              undefined;
            return (
              <Link key={tab.seg} href={href} className={`fd-tab ${active ? 'active' : ''}`}>
                {tab.en}
                {count != null && count > 0 && <span className="fd-tab-count">{count}</span>}
              </Link>
            );
          })}
        </div>

        <div className="fd-content">{children}</div>
      </div>

      <TasksPill file={file}/>
    </>
  );
}
