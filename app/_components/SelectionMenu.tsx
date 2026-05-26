'use client';
// Floating toolbar that appears above the user's text selection.
// Mounted once globally; uses useSelection() to detect when to show.

import { useState } from 'react';
import { useSelection } from '@/app/_lib/use-selection';
import { useSparks } from '@/app/_lib/sparks-store';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useModal } from './modals/ModalProvider';
import { api } from '@/app/_lib/api';

export function SelectionMenu() {
  const sel = useSelection();
  const { create: createSpark } = useSparks();
  const { file } = useActiveFile();
  const { open: openModal } = useModal();
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);

  if (!sel.text || !sel.rect) {
    if (translation) setTranslation(null);
    return null;
  }

  const top = Math.max(8, sel.rect.top + window.scrollY - 44);
  const left = sel.rect.left + window.scrollX + sel.rect.width / 2;

  const findSources = () => {
    // Stash the selected text so SourceModal can pre-fill its query.
    sessionStorage.setItem('drashai.selection-query', sel.text);
    openModal('sources');
  };

  const copyToSparks = async () => {
    await createSpark({
      body: sel.text,
      tag: 'Highlight',
      fileId: file?.id,
    });
    // Tiny visual ack — selection menu disappears on its own when selection clears.
    window.getSelection()?.removeAllRanges();
  };

  const translateThis = async () => {
    setTranslating(true);
    setTranslation(null);
    try {
      const text = await api.translate(sel.text);
      setTranslation(text);
    } finally {
      setTranslating(false);
    }
  };

  return (
    <>
      <div
        className="selection-menu"
        style={{
          top, left,
          transform: 'translate(-50%, -100%)',
        }}
        onMouseDown={(e) => e.preventDefault()}>
        <button type="button" onClick={findSources} title="Search sources for this">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>
          </svg>
          <span>Find sources</span>
        </button>
        <span className="selection-menu-div"/>
        <button type="button" onClick={translateThis} title="Translate this passage">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 5h7M4 9h7M7 5v8M14 13l3-8 3 8M15 11h4"/>
          </svg>
          <span>Translate</span>
        </button>
        <span className="selection-menu-div"/>
        <button type="button" onClick={copyToSparks} title="Save as a spark">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L9 12l-7 1 5.5 5L6 22l6-4 6 4-1.5-4L22 13l-7-1z"/>
          </svg>
          <span>To Sparks</span>
        </button>
      </div>

      {(translating || translation) && (
        <div
          className="selection-translation"
          style={{
            top: top + 44,
            left,
            transform: 'translate(-50%, 0)',
          }}>
          {translating ? (
            <span className="selection-translation-loading">Translating…</span>
          ) : (
            <span className="selection-translation-text">{translation}</span>
          )}
        </div>
      )}
    </>
  );
}
