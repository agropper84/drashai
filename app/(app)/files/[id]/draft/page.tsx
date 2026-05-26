'use client';
// Plan 11 — single centered paper. AI controls live in a floating helper pill
// at the bottom. ⌘J opens the helper from anywhere on this tab.

import { useEffect, useState } from 'react';
import { useActiveFile } from '@/app/_lib/use-active-file';
import { useTemplates } from '@/app/_lib/templates-store';
import { useSparks } from '@/app/_lib/sparks-store';
import { useEncounters } from '@/app/_lib/encounters-store';
import { api } from '@/app/_lib/api';
import { HelperPill } from '@/app/_components/draft/HelperPill';
import { Composer, ComposerHandle } from '@/app/_components/draft/Composer';
import { useRef } from 'react';
import { toGenerateParams, VoiceStop } from '@/app/_lib/voice-mode';

export default function DraftTab() {
  const { file, patch } = useActiveFile();
  const { templates } = useTemplates();
  const { sparks } = useSparks();
  const { refresh } = useEncounters();
  const composerRef = useRef<ComposerHandle>(null);

  const [voiceStop, setVoiceStop] = useState<VoiceStop>(2);
  const [instructions, setInstructions] = useState('');
  const [userDraft, setUserDraft] = useState('');
  const [generating, setGenerating] = useState(false);
  const [streamed, setStreamed] = useState('');
  const [helperOpen, setHelperOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('drashai.voiceStop');
    if (stored) setVoiceStop(Number(stored) as VoiceStop);
  }, []);
  useEffect(() => { localStorage.setItem('drashai.voiceStop', String(voiceStop)); }, [voiceStop]);

  // ⌘J / Ctrl+J — open helper from anywhere on this page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setHelperOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!file) return null;
  const tpl = templates.find((t) => t.id === file.type);

  const wordCount = userDraft.trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.round(wordCount / 130));

  const handleGenerate = async () => {
    if (!file.transcript?.trim()) return;
    setGenerating(true);
    setStreamed('');
    setHelperOpen(false);
    try {
      const fileTemplate = templates.find((t) => t.id === file.type);
      const vars = fileTemplate?.variables || ['transcript', 'notes'];
      const fileSparks = sparks.filter((s) => s.fileId === file.id);
      const sparkContext = vars.includes('sparks') && fileSparks.length > 0
        ? fileSparks.map((s) => `[${s.tag || 'Note'}] ${s.body}`).join('\n') : undefined;
      const sourcesContext = vars.includes('sources') && file.sources?.length
        ? file.sources.map((s) => `[${s.ref}]\n${s.he}\n${s.en}`).join('\n\n') : undefined;
      const { aiMode, preserveLevel } = toGenerateParams(voiceStop);

      const res = await api.generate({
        transcript: vars.includes('transcript') ? file.transcript : undefined,
        notes: vars.includes('notes') ? file.notes : undefined,
        type: file.type || 'sermon',
        instructions: instructions.trim() || undefined,
        congregantName: file.congregantName,
        customPrompt: fileTemplate?.prompt,
        templateBody: fileTemplate?.fullBody,
        sparkContext, sourcesContext,
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
    <>
      <div className="fd-paper" data-selectable="true">
        <div className="fd-paper-meta">{wordCount} words · ~{readMinutes} min</div>
        <textarea
          className="fd-paper-textarea"
          value={userDraft}
          onChange={(e) => setUserDraft(e.target.value)}
          placeholder="Begin writing..."
        />
      </div>

      {(showStreamed || previousDrafts.length > 0) && (
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
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, lineHeight: 1.75 }}>
                {g.content.split('\n\n').map((para, j) => (
                  <p key={j} style={{ margin: '0 0 1.1em', whiteSpace: 'pre-wrap' }}>{para}</p>
                ))}
              </div>
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
      />
    </>
  );
}
