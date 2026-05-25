'use client';
import { I } from '@/app/_components/Icons';
import { useActiveFile } from '@/app/_lib/use-active-file';

export default function FinalTab() {
  const { file } = useActiveFile();
  if (!file) return null;

  const finalContent = file.generatedContent?.[file.generatedContent.length - 1];

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <div>
      <div className="section-head">
        <div>
          <h2 className="section-title">סופי</h2>
          <div className="section-title-en">Final reading copy</div>
        </div>
        {finalContent && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn small" onClick={() => handleCopy(finalContent.content)}>
              <span className="icon">{I.copy}</span> Copy
            </button>
            <button className="btn small" onClick={() => window.print()}>
              <span className="icon">{I.print}</span> Print
            </button>
          </div>
        )}
      </div>

      {!finalContent ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>
            No draft generated yet. Open the Draft tab to write or generate.
          </p>
        </div>
      ) : (
        <div className="composer-paper grain" style={{ padding: 56 }}>
          <div className="composer-body">
            {finalContent.content.split('\n\n').map((para, i) => (
              <p key={i} className={i === 0 ? 'first-cap' : ''} style={{ whiteSpace: 'pre-wrap' }}>{para}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
