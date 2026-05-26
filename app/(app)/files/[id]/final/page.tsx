'use client';
// Final tab — last generated content with copy, print, translate, and Word download.

import { useState } from 'react';
import { I } from '@/app/_components/Icons';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { TranslatePanel } from '@/app/_components/translate/TranslatePanel';

/** Generate a minimal .docx-compatible HTML blob and trigger download. */
function downloadAsWord(content: string, filename: string) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><style>
body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.8; margin: 1in; }
p { margin: 0 0 12pt; }
</style></head>
<body>${content.split('\n\n').map((p) => `<p>${p.replace(/\n/g, '<br/>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/__(.+?)__/g, '<u>$1</u>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
  }</p>`).join('\n')}</body></html>`;

  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.replace(/[^a-zA-Z0-9\s\-_.]/g, '') + '.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function FinalTab() {
  const { file } = useActiveFile();
  const [showTranslate, setShowTranslate] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!file) return null;

  const finalContent = file.generatedContent?.[file.generatedContent.length - 1];

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!finalContent) return;
    const name = [
      file.subject || file.congregantName || 'Draft',
      finalContent.type?.replace('_', ' '),
      new Date(finalContent.generatedAt).toLocaleDateString(),
    ].filter(Boolean).join(' — ');
    downloadAsWord(finalContent.content, name);
  };

  return (
    <div>
      <div className="section-head">
        <div>
          <h2 className="section-title">סופי</h2>
          <div className="section-title-en">Final reading copy</div>
        </div>
        {finalContent && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className={`btn small${showTranslate ? ' primary' : ''}`} onClick={() => setShowTranslate((v) => !v)}>
              Translate
            </button>
            <button className="btn small" onClick={() => handleCopy(finalContent.content)}>
              <span className="icon">{I.copy}</span> {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="btn small" onClick={handleDownload}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Word
            </button>
            <button className="btn small" onClick={() => window.print()}>
              <span className="icon">{I.print}</span> Print
            </button>
          </div>
        )}
      </div>

      {showTranslate && finalContent && (
        <TranslatePanel source={finalContent.content} />
      )}

      {!finalContent ? (
        <div className="empty-state" style={{ padding: 40 }}>
          <p style={{ fontStyle: 'italic', color: 'var(--ink-3)' }}>
            No draft generated yet. Open the Draft tab to write or generate.
          </p>
        </div>
      ) : (
        <div className="composer-paper grain" data-selectable="true" style={{ padding: 56 }}>
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
