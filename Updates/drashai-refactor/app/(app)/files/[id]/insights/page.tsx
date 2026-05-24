'use client';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useSparks } from '@/app/_lib/sparks-store';

// Plan 6 makes this share the global sparks store via filter.
// Initially: a placeholder for sparks linked to this file via fileId.

export default function InsightsTab() {
  const { file } = useActiveFile();
  const { sparks } = useSparks();
  if (!file) return null;

  const fileSparks = sparks.filter((s) => s.fileId === file.id);

  return (
    <div>
      <div className="section-head">
        <div>
          <h2 className="section-title">ניצוצות</h2>
          <div className="section-title-en">Insights for this file</div>
        </div>
      </div>

      {fileSparks.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>
            No sparks linked to this file yet. (Plan 6 will let you assign global sparks here.)
          </p>
        </div>
      ) : (
        <div className="insight-grid">
          {fileSparks.map((s) => (
            <div key={s.id} className="insight-card">
              <div className="insight-tag">{s.tag}</div>
              <div className="insight-body">{s.body}</div>
              <div className="insight-foot">{s.when}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
