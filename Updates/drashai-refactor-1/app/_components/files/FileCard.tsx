'use client';
// Single card in the file grid. Kept close to current behavior for Commit 5 (this PR).
// Plan 2 will redesign the card content; Plan 3 will replace the trash icon with a
// safe overflow menu.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { I } from '../Icons';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useTemplates } from '@/app/_lib/templates-store';
import type { Encounter } from '@/app/_lib/types';

export function FileCard({ encounter }: { encounter: Encounter }) {
  const router = useRouter();
  const { remove } = useEncounters();
  const { getById: getTemplate } = useTemplates();
  const typeInfo = getTemplate(encounter.type);
  const hasGenerated = (encounter.generatedContent?.length || 0) > 0;

  return (
    <div className="card file-card" onClick={() => router.push(`/files/${encounter.id}`)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div className="file-type">{typeInfo?.en || encounter.topic || 'Encounter'}</div>
        {encounter.sealed && (
          <span className="badge sealed">
            <span className="icon" style={{ width: 11, height: 11 }}>{I.lock}</span> Sealed
          </span>
        )}
        {hasGenerated && !encounter.sealed && <span className="badge draft">Draft</span>}
      </div>

      <div className="file-title-heb">{typeInfo?.heb || ''}</div>
      <div className="file-title-en">{encounter.congregantName}</div>

      <div className="file-meta">
        <div className={`status-dot ${hasGenerated ? 'active' : ''}`} />
        <span>{encounter.date}</span>
        <span className="dot" />
        {encounter.transcript
          ? <span>{encounter.transcript.split('\n').length} lines</span>
          : <span>No transcript</span>}
      </div>

      <button
        className="btn ghost small"
        style={{ position: 'absolute', top: 8, right: 8, minHeight: 28, minWidth: 28, padding: 4 }}
        onClick={(e) => {
          e.stopPropagation();
          // PLAN 3 will replace this with a confirm dialog
          if (confirm(`Delete ${encounter.congregantName}?`)) remove(encounter.id);
        }}>
        <span className="icon" style={{ width: 14, height: 14 }}>{I.trash}</span>
      </button>
    </div>
  );
}
