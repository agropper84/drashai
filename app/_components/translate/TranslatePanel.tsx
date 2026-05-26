'use client';
// Side-by-side translation. Pass a string; we render the source on one side
// and the live translation on the other, with a direction picker.

import { useState } from 'react';
import { Direction, useTranslation } from './useTranslation';

export interface TranslatePanelProps {
  source: string;
  /** Initial direction. 'auto' will detect from the source. */
  direction?: Direction;
  /** When true (the default), the panel scrolls. Otherwise it sizes to content. */
  scrollable?: boolean;
}

function detectIsHebrew(text: string): boolean {
  // Rough heuristic — count Hebrew Unicode chars vs Latin.
  let heb = 0, lat = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= 0x0590 && c <= 0x05FF) heb++;
    else if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)) lat++;
  }
  return heb > lat;
}

export function TranslatePanel({ source, direction = 'auto', scrollable = true }: TranslatePanelProps) {
  const [dir, setDir] = useState<Direction>(direction);
  const effective: Direction = dir === 'auto'
    ? (detectIsHebrew(source) ? 'he-en' : 'en-he')
    : dir;
  const { translated, loading, error } = useTranslation(source, effective);

  const sourceIsHebrew = effective === 'he-en';

  return (
    <div className="translate-panel">
      <div className="translate-panel-head">
        <div className="translate-panel-direction">
          <button
            type="button"
            className={dir === 'he-en' ? 'active' : ''}
            onClick={() => setDir('he-en')}>
            עברית → English
          </button>
          <button
            type="button"
            className={dir === 'auto' ? 'active' : ''}
            onClick={() => setDir('auto')}>
            Auto
          </button>
          <button
            type="button"
            className={dir === 'en-he' ? 'active' : ''}
            onClick={() => setDir('en-he')}>
            English → עברית
          </button>
        </div>
        {loading && <span className="translate-panel-loading">Translating…</span>}
      </div>

      <div className={`translate-panel-body${scrollable ? ' scrollable' : ''}`}>
        <div
          className={`translate-panel-col source${sourceIsHebrew ? ' rtl' : ''}`}
          data-selectable="true">
          <div className="translate-panel-label">
            {sourceIsHebrew ? 'מקור' : 'Source'}
          </div>
          <div className={`translate-panel-text${sourceIsHebrew ? ' heb-display' : ''}`}>
            {source.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>

        <div
          className={`translate-panel-col target${!sourceIsHebrew ? ' rtl' : ''}`}
          data-selectable="true">
          <div className="translate-panel-label">
            {sourceIsHebrew ? 'English' : 'תרגום'}
          </div>
          <div className={`translate-panel-text${!sourceIsHebrew ? ' heb-display' : ''}`}>
            {error
              ? <p style={{ color: 'var(--accent)' }}>Translation failed: {error}</p>
              : translated
                ? translated.split('\n\n').map((p, i) => <p key={i}>{p}</p>)
                : (
                  <p style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>
                    {loading ? '…' : 'Click a direction to begin.'}
                  </p>
                )}
          </div>
        </div>
      </div>
    </div>
  );
}
