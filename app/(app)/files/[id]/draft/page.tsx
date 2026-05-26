'use client';
// Plan 11 — single centered paper. AI controls live in a floating helper pill
// at the bottom. ⌘J opens the helper from anywhere on this tab.
// Live translate: ⌘T toggles side-by-side translation panel.

import { useEffect, useState, useRef, useCallback } from 'react';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useTemplates } from '@/app/_lib/templates-store';
import { useSparks } from '@/app/_lib/sparks-store';
import { useEncounters } from '@/app/_lib/encounters-store';
import { api } from '@/app/_lib/api';
import { HelperPill, SourceKey } from '@/app/_components/draft/HelperPill';
import { toGenerateParams, VoiceStop } from '@/app/_lib/voice-mode';
import { DraftMic } from '@/app/_components/draft/DraftMic';
import { useTranslation, Direction } from '@/app/_components/translate/useTranslation';
import { useSelection } from '@/app/_lib/use-selection';
import { useDebounce } from '@/app/_lib/use-debounce';
import { useZenMode } from '@/app/_lib/zen-mode';

/** Wrap the selected text in the textarea with `before` and `after` markers. */
function wrapSelection(ta: HTMLTextAreaElement, before: string, after: string, setValue: (v: string) => void) {
  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const text = ta.value;
  const selected = text.substring(start, end);
  const wrapped = before + selected + after;
  const next = text.substring(0, start) + wrapped + text.substring(end);
  setValue(next);
  // Restore cursor after React re-render
  requestAnimationFrame(() => {
    ta.selectionStart = start + before.length;
    ta.selectionEnd = end + before.length;
    ta.focus();
  });
}

function detectIsHebrew(text: string): boolean {
  let heb = 0, lat = 0;
  for (const ch of text) {
    const c = ch.charCodeAt(0);
    if (c >= 0x0590 && c <= 0x05FF) heb++;
    else if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)) lat++;
  }
  return heb > lat;
}

export default function DraftTab() {
  const { file, patch } = useActiveFile();
  const { templates } = useTemplates();
  const { sparks } = useSparks();
  const { refresh } = useEncounters();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [voiceStop, setVoiceStop] = useState<VoiceStop>(2);
  const [instructions, setInstructions] = useState('');
  const [userDraft, setUserDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [streamed, setStreamed] = useState('');
  const [helperOpen, setHelperOpen] = useState(false);
  const { zen, toggle: toggleZen } = useZenMode();
  const [editingGenIdx, setEditingGenIdx] = useState<number | null>(null);
  const [editingGenContent, setEditingGenContent] = useState('');

  // Translation state
  const [translateActive, setTranslateActive] = useState(false);
  const [translateMode, setTranslateMode] = useState<'all' | 'selection'>('all');
  const [translateDir, setTranslateDir] = useState<Direction>('auto');
  const [copied, setCopied] = useState(false);

  const selection = useSelection();
  const debouncedDraft = useDebounce(userDraft, 800);

  // Determine source text for translation
  const translateSource = translateMode === 'selection' ? selection.text : debouncedDraft;
  const effectiveDir: Direction = translateDir === 'auto'
    ? (detectIsHebrew(translateSource) ? 'he-en' : 'en-he')
    : translateDir;
  const { translated, loading: translateLoading } = useTranslation(
    translateActive ? translateSource : '',
    effectiveDir,
  );
  const targetIsHebrew = effectiveDir === 'en-he';

  useEffect(() => {
    const stored = localStorage.getItem('drashai.voiceStop');
    if (stored) setVoiceStop(Number(stored) as VoiceStop);
  }, []);
  useEffect(() => { localStorage.setItem('drashai.voiceStop', String(voiceStop)); }, [voiceStop]);

  // ⌘J — helper, ⌘T — translate, ⌘B/I/U/S — formatting (⌘. handled by useZenMode)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'j') { e.preventDefault(); setHelperOpen(true); }
      if (k === 't') { e.preventDefault(); setTranslateActive((v) => !v); }
      // Formatting shortcuts — only when the draft textarea is focused
      const ta = textareaRef.current;
      if (ta && document.activeElement === ta) {
        if (k === 'b') { e.preventDefault(); wrapSelection(ta, '**', '**', setUserDraft); }
        if (k === 'i') { e.preventDefault(); wrapSelection(ta, '*', '*', setUserDraft); }
        if (k === 'u') { e.preventDefault(); wrapSelection(ta, '__', '__', setUserDraft); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleInsert = useCallback(() => {
    if (!translated) return;
    const ta = textareaRef.current;
    if (ta) {
      const pos = ta.selectionStart ?? userDraft.length;
      const before = userDraft.slice(0, pos);
      const after = userDraft.slice(pos);
      const sep = before && !before.endsWith('\n') ? '\n\n' : '';
      setUserDraft(before + sep + translated + after);
    } else {
      setUserDraft((prev) => prev ? prev + '\n\n' + translated : translated);
    }
  }, [translated, userDraft]);

  const handleReplace = useCallback(() => {
    if (!translated || !selection.text) return;
    const idx = userDraft.indexOf(selection.text);
    if (idx === -1) return;
    setUserDraft(userDraft.slice(0, idx) + translated + userDraft.slice(idx + selection.text.length));
  }, [translated, selection.text, userDraft]);

  const handleCopy = useCallback(async () => {
    if (!translated) return;
    await navigator.clipboard.writeText(translated);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [translated]);

  if (!file) return null;

  const wordCount = userDraft.trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.round(wordCount / 130));

  const fileSparks = sparks.filter((s) => s.fileId === file.id);

  const handleGenerate = async (selectedSources: SourceKey[]) => {
    const sel = new Set(selectedSources);
    // Need at least transcript or draft to generate
    if (!sel.has('transcript') && !sel.has('draft') && !sel.has('notes')) return;
    setGenerating(true);
    setStreamed('');
    setHelperOpen(false);
    try {
      const fileTemplate = templates.find((t) => t.id === file.type);
      const sparkContext = sel.has('sparks') && fileSparks.length > 0
        ? fileSparks.map((s) => `[${s.tag || 'Note'}] ${s.body}`).join('\n') : undefined;
      const sourcesContext = sel.has('sources') && file.sources?.length
        ? file.sources.map((s) => `[${s.ref}]\n${s.he}\n${s.en}`).join('\n\n') : undefined;
      const { aiMode, preserveLevel } = toGenerateParams(voiceStop);

      const res = await api.generate({
        transcript: sel.has('transcript') ? file.transcript : undefined,
        notes: sel.has('notes') ? file.notes : undefined,
        type: file.type || 'sermon',
        instructions: instructions.trim() || undefined,
        congregantName: file.congregantName,
        customPrompt: fileTemplate?.prompt,
        templateBody: fileTemplate?.fullBody,
        sparkContext, sourcesContext,
        userDraft: sel.has('draft') ? userDraft.trim() || undefined : undefined,
        aiMode,
        preserveLevel: sel.has('draft') && userDraft.trim() ? preserveLevel : undefined,
        voiceStop,
      });
      if (!res.ok) throw new Error('Generation failed');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamed(full.replace(/\n\n__STREAM_DONE__$/, ''));
      }
      full = full.replace(/\n\n__STREAM_DONE__$/, '');
      await patch(file.id, {
        addGenerated: { type: file.type || 'sermon', content: full, generatedAt: new Date().toISOString() },
      });
      refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      setStreamed(`Error: ${msg}`);
    } finally {
      setGenerating(false);
    }
  };

  const previousDrafts = file.generatedContent || [];
  const showStreamed = !!streamed;

  return (
    <div className={zen ? 'fd-zen' : undefined}>
      {zen && (
        <button className="fd-zen-exit" onClick={toggleZen} title="Exit zen mode (⌘.)">
          ESC
        </button>
      )}
      <div className={translateActive && !zen ? 'fd-draft-split' : undefined}>
        <div className="fd-paper" data-selectable="true">
          <div className="fd-paper-meta">
            {wordCount} words · ~{readMinutes} min
            <DraftMic onInsert={(text) => setUserDraft((prev) => prev ? prev + '\n\n' + text : text)} />
            <button
              className={`fd-zen-toggle${zen ? ' active' : ''}`}
              onClick={toggleZen}
              title="Zen mode (⌘.)"
            >◎</button>
            {!zen && (
              <button
                className={`fd-translate-toggle${translateActive ? ' active' : ''}`}
                onClick={() => setTranslateActive((v) => !v)}
                title="Toggle translation (⌘T)"
              >A↔א</button>
            )}
          </div>
          <div className="fd-format-bar">
            <button type="button" title="Bold (⌘B)" onClick={() => textareaRef.current && wrapSelection(textareaRef.current, '**', '**', setUserDraft)}>
              <strong>B</strong>
            </button>
            <button type="button" title="Italic (⌘I)" onClick={() => textareaRef.current && wrapSelection(textareaRef.current, '*', '*', setUserDraft)}>
              <em>I</em>
            </button>
            <button type="button" title="Underline (⌘U)" onClick={() => textareaRef.current && wrapSelection(textareaRef.current, '__', '__', setUserDraft)}>
              <span style={{ textDecoration: 'underline' }}>U</span>
            </button>
            <button type="button" title="Strikethrough" onClick={() => textareaRef.current && wrapSelection(textareaRef.current, '~~', '~~', setUserDraft)}>
              <span style={{ textDecoration: 'line-through' }}>S</span>
            </button>
          </div>
          <textarea
            ref={textareaRef}
            className="fd-paper-textarea"
            value={userDraft}
            onChange={(e) => setUserDraft(e.target.value)}
            placeholder="Begin writing..."
          />
        </div>

        {translateActive && !zen && (
          <div className="fd-paper fd-translate-paper" data-selectable="true">
            <div className="fd-paper-meta">
              <div className="fd-translate-mode">
                <button
                  className={translateMode === 'all' ? 'active' : ''}
                  onClick={() => setTranslateMode('all')}
                >All</button>
                <button
                  className={translateMode === 'selection' ? 'active' : ''}
                  onClick={() => setTranslateMode('selection')}
                >Selection</button>
              </div>
              <div className="translate-panel-direction">
                <button className={translateDir === 'he-en' ? 'active' : ''} onClick={() => setTranslateDir('he-en')}>
                  עברית → En
                </button>
                <button className={translateDir === 'auto' ? 'active' : ''} onClick={() => setTranslateDir('auto')}>
                  Auto
                </button>
                <button className={translateDir === 'en-he' ? 'active' : ''} onClick={() => setTranslateDir('en-he')}>
                  En → עברית
                </button>
              </div>
            </div>

            {translateLoading && (
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
                Translating...
              </div>
            )}

            {translateMode === 'selection' && !selection.text ? (
              <div className="fd-translate-placeholder">
                Highlight text in your draft to translate.
              </div>
            ) : !translateSource.trim() ? (
              <div className="fd-translate-placeholder">
                Start writing to see a live translation.
              </div>
            ) : (
              <div className={`fd-translate-content${targetIsHebrew ? ' rtl' : ''}`}>
                {translated
                  ? translated.split('\n\n').map((para, i) => <p key={i}>{para}</p>)
                  : !translateLoading && (
                    <div className="fd-translate-placeholder">Translation will appear here.</div>
                  )}
              </div>
            )}

            {translated && (
              <div className="fd-translate-actions">
                <button onClick={handleInsert} title="Insert translation at cursor position in draft">
                  Insert at cursor
                </button>
                {translateMode === 'selection' && selection.text && (
                  <button onClick={handleReplace} title="Replace selected text with translation">
                    Replace
                  </button>
                )}
                <button onClick={handleCopy}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {!zen && (showStreamed || previousDrafts.length > 0) && (
        <div style={{ maxWidth: 720, margin: '24px auto 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {showStreamed && (
            <div className="fd-paper" data-selectable="true">
              <div className="fd-paper-meta" style={{ color: 'var(--gold)' }}>AI Generated</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, lineHeight: 1.75 }}>
                {streamed.split('\n\n').map((para, i) => (
                  <p key={i} style={{ margin: '0 0 1.1em', whiteSpace: 'pre-wrap' }}>{para}</p>
                ))}
              </div>
            </div>
          )}
          {!showStreamed && previousDrafts.length > 0 && previousDrafts.map((g, i) => (
            <div key={i} className="fd-paper" data-selectable="true">
              <div className="fd-paper-meta">
                {g.type.replace('_', ' ')} · {new Date(g.generatedAt).toLocaleDateString()}
                <button
                  className="fd-gen-action"
                  title="Edit this draft"
                  onClick={() => {
                    if (editingGenIdx === i) { setEditingGenIdx(null); }
                    else { setEditingGenIdx(i); setEditingGenContent(g.content); }
                  }}>
                  {editingGenIdx === i ? 'Cancel' : 'Edit'}
                </button>
                <button
                  className="fd-gen-action delete"
                  title="Delete this draft"
                  onClick={async () => {
                    await patch(file.id, { removeGenerated: i });
                    refresh();
                    if (editingGenIdx === i) setEditingGenIdx(null);
                  }}>
                  ×
                </button>
              </div>
              {editingGenIdx === i ? (
                <>
                  <textarea
                    className="fd-paper-textarea"
                    value={editingGenContent}
                    onChange={(e) => setEditingGenContent(e.target.value)}
                    style={{ minHeight: 200 }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                    <button className="btn ghost small" onClick={() => setEditingGenIdx(null)}>Cancel</button>
                    <button
                      className="btn primary small"
                      onClick={async () => {
                        await patch(file.id, { updateGenerated: { index: i, content: editingGenContent } });
                        refresh();
                        setEditingGenIdx(null);
                      }}>
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, lineHeight: 1.75 }}>
                  {g.content.split('\n\n').map((para, j) => (
                    <p key={j} style={{ margin: '0 0 1.1em', whiteSpace: 'pre-wrap' }}>{para}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <HelperPill
        voiceStop={voiceStop}
        setVoiceStop={setVoiceStop}
        instructions={instructions}
        setInstructions={setInstructions}
        generating={generating}
        onGenerate={handleGenerate}
        open={helperOpen}
        setOpen={setHelperOpen}
        askContext={{
          draft: userDraft,
          transcript: file.transcript,
          notes: file.notes,
          type: file.type,
        }}
        file={file}
        fileSparks={fileSparks}
      />
    </div>
  );
}
