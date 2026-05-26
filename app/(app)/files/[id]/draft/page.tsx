'use client';
// Plan 10 — Draft tab gains Zen mode (⌘.), translate toggle, and
// data-selectable for selection menu.

import { useEffect, useRef, useState } from 'react';
import { I } from '@/app/_components/Icons';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useTemplates } from '@/app/_lib/templates-store';
import { useSparks } from '@/app/_lib/sparks-store';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useModal } from '@/app/_components/modals/ModalProvider';
import { api } from '@/app/_lib/api';
import { VoiceSlider } from '@/app/_components/draft/VoiceSlider';
import { MoreOptions } from '@/app/_components/draft/MoreOptions';
import { Composer, ComposerHandle } from '@/app/_components/draft/Composer';
import { AttachedSourcesPanel } from '@/app/_components/draft/AttachedSourcesPanel';
import { toGenerateParams, VoiceStop, descriptorFor } from '@/app/_lib/voice-mode';
import { useZenMode } from '@/app/_lib/zen-mode';
import { TranslatePanel } from '@/app/_components/translate/TranslatePanel';

export default function DraftTab() {
  const { file, patch } = useActiveFile();
  const { templates } = useTemplates();
  const { sparks } = useSparks();
  const { refresh } = useEncounters();
  const { open } = useModal();

  const composerRef = useRef<ComposerHandle>(null);
  const [voiceStop, setVoiceStop] = useState<VoiceStop>(2);
  const [preserveOverride, setPreserveOverride] = useState<number | undefined>(undefined);
  const [draftType, setDraftType] = useState('sermon');
  const [userDraft, setUserDraft] = useState('');
  const [draftInstructions, setDraftInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);
  const { zen, toggle: toggleZen } = useZenMode();

  useEffect(() => {
    const stored = localStorage.getItem('drashai.voiceStop');
    if (stored) setVoiceStop(Number(stored) as VoiceStop);
  }, []);
  useEffect(() => { localStorage.setItem('drashai.voiceStop', String(voiceStop)); }, [voiceStop]);

  if (!file) return null;
  const typeInfo = templates.find((t) => t.id === file.type);
  const descriptor = descriptorFor(voiceStop);
  const attachedSources = file.sources || [];

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
      const sourcesContext = vars.includes('sources') && attachedSources.length
        ? attachedSources.map((s) => `[${s.ref}]\n${s.he}\n${s.en}`).join('\n\n') : undefined;
      const styleExcerpts = fileTemplate?.styleDocuments?.map((d) => d.excerpt).filter(Boolean).join('\n\n---\n\n') || undefined;
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
    <div className={`composer${zen ? ' zen' : ''}`}>
      <div>
        <div className="toolbar">
          <button className="icon-btn" title="Bold"><span style={{ fontWeight: 700, fontFamily: 'serif', fontSize: 14 }}>B</span></button>
          <button className="icon-btn" title="Italic"><span style={{ fontStyle: 'italic', fontFamily: 'serif', fontSize: 14 }}>I</span></button>
          <button className="icon-btn" title="Block Quote"><span style={{ fontSize: 14 }}>&ldquo;</span></button>
          <div className="divider-v" />
          <button className="icon-btn" title="Hebrew text"><span className="heb" style={{ fontSize: 13 }}>עב</span></button>
          <button
            className="icon-btn"
            title="Insert source (⌘K)"
            onClick={() => open('sources')}>
            <span className="icon" style={{ width: 16, height: 16 }}>{I.book}</span>
          </button>
          <div className="divider-v" />
          <button className={`icon-btn${showTranslate ? ' active' : ''}`} title="Translate" onClick={() => setShowTranslate((v) => !v)}>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>A⇄</span>
          </button>
          <button className={`icon-btn${zen ? ' active' : ''}`} title="Zen mode (⌘.)" onClick={toggleZen}>
            <span style={{ fontSize: 14 }}>◎</span>
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="btn ghost small"
            onClick={() => handleCopy(userDraft || streamedContent || file.generatedContent?.[file.generatedContent.length - 1]?.content || '')}>
            <span className="icon" style={{ width: 14, height: 14 }}>{I.copy}</span>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <Composer
          ref={composerRef}
          value={userDraft}
          onChange={setUserDraft}
          attachedSources={attachedSources}
          title={typeInfo?.heb || 'טיוטה'}
          subtitle={file.subject || file.congregantName}
          placeholder="Begin writing your thoughts here... (⌘K to insert a source)"
        />

        {showTranslate && (userDraft || streamedContent || file.generatedContent?.length) && (
          <TranslatePanel source={userDraft || streamedContent || file.generatedContent?.[file.generatedContent.length - 1]?.content || ''} />
        )}

        {streamedContent && (
          <div className="composer-paper grain" data-selectable="true" style={{ position: 'relative' }}>
            <div className="mono" style={{ color: 'var(--gold)', marginBottom: 12, textAlign: 'center' }}>AI Generated</div>
            <div className="composer-body" style={{ minHeight: 0 }}>
              {streamedContent.split('\n\n').map((para, i) => (
                <p key={i} className={i === 0 ? 'first-cap' : ''} style={{ whiteSpace: 'pre-wrap' }}>{para}</p>
              ))}
            </div>
          </div>
        )}

        {!streamedContent && file.generatedContent?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {file.generatedContent.map((g, i) => (
              <div key={i} className="composer-paper grain" data-selectable="true" style={{ position: 'relative' }}>
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

      <div className="aside">
        <div className="aside-card">
          <div className="aside-h">AI Voice</div>
          <VoiceSlider value={voiceStop} onChange={setVoiceStop}/>
        </div>

        <AttachedSourcesPanel
          sources={attachedSources}
          onPick={(s) => composerRef.current?.insertSource(s)}
          onOpenSearch={() => open('sources')}
        />

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
    </div>
  );
}
