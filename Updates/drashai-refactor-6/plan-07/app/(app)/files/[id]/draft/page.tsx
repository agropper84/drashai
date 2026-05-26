'use client';
// Plan 7 — Draft tab. Voice slider replaces the Heavy/Collab/Light + Preserve
// controls. Generation logic unchanged — we compute aiMode + preserveLevel
// from the slider position via toGenerateParams().

import { useEffect, useState } from 'react';
import { I } from '@/app/_components/Icons';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useTemplates } from '@/app/_lib/templates-store';
import { useSparks } from '@/app/_lib/sparks-store';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useModal } from '@/app/_components/modals/ModalProvider';
import { api } from '@/app/_lib/api';
import { VoiceSlider } from '@/app/_components/draft/VoiceSlider';
import { MoreOptions } from '@/app/_components/draft/MoreOptions';
import { toGenerateParams, VoiceStop, descriptorFor } from '@/app/_lib/voice-mode';

export default function DraftTab() {
  const { file, patch } = useActiveFile();
  const { templates } = useTemplates();
  const { sparks } = useSparks();
  const { refresh } = useEncounters();
  const { open } = useModal();

  // Plan 7 — single voice control.
  const [voiceStop, setVoiceStop] = useState<VoiceStop>(2);
  const [preserveOverride, setPreserveOverride] = useState<number | undefined>(undefined);
  const [draftType, setDraftType] = useState('sermon');
  const [userDraft, setUserDraft] = useState('');
  const [draftInstructions, setDraftInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [zenMode, setZenMode] = useState(false);
  const [asideCollapsed, setAsideCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Persist voice stop per user.
  useEffect(() => {
    const stored = localStorage.getItem('drashai.voiceStop');
    if (stored) setVoiceStop(Number(stored) as VoiceStop);
  }, []);
  useEffect(() => {
    localStorage.setItem('drashai.voiceStop', String(voiceStop));
  }, [voiceStop]);

  if (!file) return null;
  const typeInfo = templates.find((t) => t.id === file.type);
  const descriptor = descriptorFor(voiceStop);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerate = async () => {
    if (!file.transcript?.trim()) return;
    setGenerating(true);
    setStreamedContent('');
    try {
      const fileTemplate = templates.find((t) => t.id === file.type);
      const vars = fileTemplate?.variables || ['transcript', 'notes'];
      const fileSparks = sparks.filter((s) => s.fileId === file.id);
      const sparkContext = vars.includes('sparks') && fileSparks.length > 0
        ? fileSparks.map((s) => `[${s.tag || 'Note'}] ${s.body}`).join('\n') : undefined;
      const sourcesContext = vars.includes('sources') && file.sources?.length
        ? file.sources.map((s) => `[${s.ref}]\n${s.he}\n${s.en}`).join('\n\n') : undefined;
      const styleExcerpts = fileTemplate?.styleDocuments?.map((d) => d.excerpt).filter(Boolean).join('\n\n---\n\n') || undefined;

      // Plan 7 — compute legacy fields from voice stop.
      const { aiMode, preserveLevel } = toGenerateParams(voiceStop, preserveOverride);

      const res = await api.generate({
        transcript: vars.includes('transcript') ? file.transcript : undefined,
        notes: vars.includes('notes') ? file.notes : undefined,
        type: draftType,
        instructions: draftInstructions.trim() || undefined,
        congregantName: file.congregantName,
        customPrompt: fileTemplate?.prompt,
        templateBody: fileTemplate?.fullBody,
        styleExcerpts,
        sparkContext,
        sourcesContext,
        userDraft: userDraft.trim() || undefined,
        aiMode,
        preserveLevel: userDraft.trim() ? preserveLevel : undefined,
        // New explicit field — backend can use this directly in the future.
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
        setStreamedContent(full.replace(/\n\n__STREAM_DONE__$/, ''));
      }
      full = full.replace(/\n\n__STREAM_DONE__$/, '');
      setStreamedContent(full);
      await patch(file.id, {
        addGenerated: { type: draftType, content: full, generatedAt: new Date().toISOString() },
      });
      refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      setStreamedContent(`Error: ${msg}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className={zenMode ? '' : 'composer'}
      style={zenMode ? {
        position: 'fixed', inset: 0, zIndex: 45, background: 'var(--bg-page)',
        display: 'grid', gridTemplateColumns: asideCollapsed ? '1fr' : '1fr 320px', overflow: 'hidden',
      } : undefined}>
      <div style={zenMode ? { overflow: 'auto', padding: '40px 48px 80px' } : undefined}>
        {/* Toolbar */}
        <div className="toolbar">
          <button className="icon-btn" title="Bold"><span style={{ fontWeight: 700, fontFamily: 'serif', fontSize: 14 }}>B</span></button>
          <button className="icon-btn" title="Italic"><span style={{ fontStyle: 'italic', fontFamily: 'serif', fontSize: 14 }}>I</span></button>
          <button className="icon-btn" title="Block Quote"><span style={{ fontSize: 14 }}>&ldquo;</span></button>
          <div className="divider-v" />
          <button className="icon-btn" title="Hebrew text"><span className="heb" style={{ fontSize: 13 }}>עב</span></button>
          <button className="icon-btn" title="Insert source" onClick={() => open('sources')}>
            <span className="icon" style={{ width: 16, height: 16 }}>{I.book}</span>
          </button>
          <div style={{ flex: 1 }} />
          <button
            className={`icon-btn ${zenMode ? 'active' : ''}`}
            title={zenMode ? 'Exit zen mode' : 'Zen mode'}
            onClick={() => setZenMode(!zenMode)}>
            <span style={{ fontSize: 14 }}>{zenMode ? '✕' : '◻'}</span>
          </button>
          <button
            className="btn ghost small"
            onClick={() => handleCopy(userDraft || streamedContent || file.generatedContent?.[file.generatedContent.length - 1]?.content || '')}>
            <span className="icon" style={{ width: 14, height: 14 }}>{I.copy}</span>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* User writing area */}
        <div className="composer-paper grain" style={{ position: 'relative', marginBottom: 16 }}>
          <h2 className="composer-h heb-display">{typeInfo?.heb || 'טיוטה'}</h2>
          <div className="composer-h-en">{file.subject || file.congregantName}</div>
          <textarea
            className="composer-body"
            value={userDraft}
            onChange={(e) => setUserDraft(e.target.value)}
            placeholder="Begin writing your thoughts here..."
            style={{
              width: '100%', border: 'none', background: 'transparent', resize: 'none',
              outline: 'none', minHeight: 300, fontFamily: "'Cormorant Garamond', serif",
              fontSize: 19, lineHeight: 1.7, color: 'var(--ink)',
            }}
          />
        </div>

        {/* Streamed content */}
        {streamedContent && (
          <div className="composer-paper grain" style={{ position: 'relative' }}>
            <div className="mono" style={{ color: 'var(--gold)', marginBottom: 12, textAlign: 'center' }}>AI Generated</div>
            <div className="composer-body" style={{ minHeight: 0 }}>
              {streamedContent.split('\n\n').map((para, i) => (
                <p key={i} className={i === 0 ? 'first-cap' : ''} style={{ whiteSpace: 'pre-wrap' }}>{para}</p>
              ))}
            </div>
          </div>
        )}

        {/* Previously generated drafts */}
        {!streamedContent && file.generatedContent?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {file.generatedContent.map((g, i) => (
              <div key={i} className="composer-paper grain" style={{ position: 'relative' }}>
                <div className="mono" style={{ color: 'var(--gold)', marginBottom: 16, textAlign: 'center' }}>
                  {g.type.replace('_', ' ')} — {new Date(g.generatedAt).toLocaleDateString()}
                </div>
                <div className="composer-body" style={{ minHeight: 0 }}>
                  {g.content.split('\n\n').map((para, j) => (
                    <p key={j} className={j === 0 ? 'first-cap' : ''} style={{ whiteSpace: 'pre-wrap' }}>{para}</p>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
                  <button className="btn ghost small" onClick={() => handleCopy(g.content)}>
                    <span className="icon" style={{ width: 14, height: 14 }}>{I.copy}</span> Copy
                  </button>
                  <button className="btn ghost small" onClick={() => window.print()}>
                    <span className="icon" style={{ width: 14, height: 14 }}>{I.print}</span> Print
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {(!zenMode || !asideCollapsed) && (
        <div className="aside" style={zenMode ? {
          overflow: 'auto', padding: '40px 20px 80px 0', borderLeft: '1px solid var(--rule-soft)',
        } : undefined}>
          {zenMode && (
            <button className="btn ghost small" style={{ marginBottom: 8 }} onClick={() => setAsideCollapsed(true)}>
              Collapse panel
            </button>
          )}

          <div className="aside-card">
            <div className="aside-h">AI Voice</div>
            <VoiceSlider value={voiceStop} onChange={setVoiceStop}/>
          </div>

          <div className="aside-card">
            <MoreOptions
              voiceStop={voiceStop}
              draftType={draftType}
              setDraftType={setDraftType}
              instructions={draftInstructions}
              setInstructions={setDraftInstructions}
              preserveOverride={preserveOverride}
              setPreserveOverride={setPreserveOverride}
            />
            <button
              className="btn primary"
              style={{ width: '100%', marginTop: 14 }}
              onClick={handleGenerate}
              disabled={generating || !file.transcript?.trim()}>
              {generating ? 'Generating...' : descriptor.stop === 1 ? 'Check facts' : descriptor.stop === 4 ? 'Generate draft' : 'Help me write'}
            </button>
            {!file.transcript?.trim() && (
              <div className="settings-help" style={{ marginTop: 8, textAlign: 'center' }}>
                Record or paste a transcript first.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
