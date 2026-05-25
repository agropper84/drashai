'use client';
import { I } from '@/app/_components/Icons';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useModal } from '@/app/_components/modals/ModalProvider';

export default function SourcesTab() {
  const { file, patch } = useActiveFile();
  const { open } = useModal();
  if (!file) return null;

  const removeSource = async (idx: number) => {
    const sources = (file.sources || []).filter((_, i) => i !== idx);
    await patch(file.id, { sources });
  };

  return (
    <div>
      <div className="section-head">
        <div>
          <h2 className="section-title">מקורות</h2>
          <div className="section-title-en">Attached Sources</div>
        </div>
        <button className="btn primary small" onClick={() => open('sources')}>
          <span className="icon">{I.search}</span> Search
        </button>
      </div>

      {!file.sources || file.sources.length === 0 ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>
            No sources attached. Open the search to find verses, midrash, or pick from your library.
          </p>
        </div>
      ) : (
        <div className="source-list">
          {file.sources.map((s, i) => (
            <div key={i} className="source-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="source-cite">{s.ref}</div>
                <button
                  className="btn ghost small"
                  style={{ minHeight: 24, minWidth: 24, padding: 2 }}
                  onClick={() => removeSource(i)}>
                  <span className="icon" style={{ width: 12, height: 12 }}>{I.trash}</span>
                </button>
              </div>
              {s.he && <div className="source-heb">{s.he}</div>}
              {s.en && <div className="source-en">{s.en}</div>}
              {s.note && <div className="source-en" style={{ fontStyle: 'italic', marginTop: 6 }}>{s.note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
