'use client';
// Composer — owns the writing textarea, the source picker, and the preview
// toggle. Exposes `insertSource` via ref so the rail can call it.

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { SourcePicker } from './SourcePicker';
import { InlineSource } from './InlineSource';
import { insertSourceAt, parseDraft } from '@/app/_lib/source-token';
import type { EncounterSource } from '@/app/_lib/types';

export interface ComposerHandle {
  insertSource: (s: Pick<EncounterSource, 'ref' | 'he' | 'en'>) => void;
  getValue: () => string;
}

export interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  attachedSources: EncounterSource[];
  /** Title rendered above the textarea (e.g. template Hebrew name). */
  title?: string;
  subtitle?: string;
  placeholder?: string;
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  { value, onChange, attachedSources, title, subtitle, placeholder }, ref,
) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | undefined>(undefined);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  const openPickerAtCaret = () => {
    const ta = taRef.current;
    if (ta) {
      const rect = ta.getBoundingClientRect();
      setAnchor({ x: Math.min(rect.left + 40, window.innerWidth - 440), y: rect.top + 40 });
    }
    setPickerOpen(true);
  };

  const insertSource: ComposerHandle['insertSource'] = (s) => {
    const ta = taRef.current;
    const caret = ta?.selectionStart ?? value.length;
    const { body, caret: newCaret } = insertSourceAt(value, caret, s);
    onChange(body);
    setPickerOpen(false);
    setTimeout(() => {
      taRef.current?.focus();
      taRef.current?.setSelectionRange(newCaret, newCaret);
    }, 0);
  };

  useImperativeHandle(ref, () => ({ insertSource, getValue: () => value }), [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ⌘K / Ctrl+K
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPickerAtCaret();
      return;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    onChange(next);
    // /source slash command — fires when the user types "/source " (with trailing space)
    const caret = e.target.selectionStart;
    const before = next.slice(0, caret);
    if (/\/source\s$/.test(before)) {
      // strip the trigger from the buffer
      const stripped = before.replace(/\/source\s$/, '') + next.slice(caret);
      onChange(stripped);
      setTimeout(() => {
        const newCaret = caret - '/source '.length;
        taRef.current?.setSelectionRange(newCaret, newCaret);
        openPickerAtCaret();
      }, 0);
    }
  };

  const segments = parseDraft(value);

  return (
    <>
      <div className="composer-paper grain" style={{ position: 'relative', marginBottom: 16 }}>
        {(title || subtitle) && (
          <>
            {title && <h2 className="composer-h heb-display">{title}</h2>}
            {subtitle && <div className="composer-h-en">{subtitle}</div>}
          </>
        )}

        <div className="composer-mode-toggle">
          <button type="button" className={mode === 'edit' ? 'active' : ''} onClick={() => setMode('edit')}>Write</button>
          <button type="button" className={mode === 'preview' ? 'active' : ''} onClick={() => setMode('preview')}>Preview</button>
        </div>

        {mode === 'edit' ? (
          <textarea
            ref={taRef}
            className="composer-body"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Begin writing your thoughts here...'}
            style={{
              width: '100%', border: 'none', background: 'transparent', resize: 'none',
              outline: 'none', minHeight: 300, fontFamily: "'Cormorant Garamond', serif",
              fontSize: 19, lineHeight: 1.7, color: 'var(--ink)',
            }}
          />
        ) : (
          <div className="composer-preview" style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 19, lineHeight: 1.7,
            color: 'var(--ink)', minHeight: 300,
          }}>
            {segments.length === 0 || (segments.length === 1 && !segments[0].text?.trim()) ? (
              <p style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>{placeholder || 'Nothing written yet.'}</p>
            ) : (
              segments.map((seg, i) =>
                seg.kind === 'text' ? (
                  <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{seg.text}</span>
                ) : seg.source ? (
                  <InlineSource key={i} source={seg.source} />
                ) : null
              )
            )}
          </div>
        )}
      </div>

      <SourcePicker
        attached={attachedSources}
        open={pickerOpen}
        anchor={anchor}
        onClose={() => setPickerOpen(false)}
        onPick={insertSource}
      />
    </>
  );
});
