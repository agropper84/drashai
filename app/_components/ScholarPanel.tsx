'use client';
// Scholar — OpenEvidence-style deep research for rabbinical questions.
// Ask a question → deep search across all sources → streaming synthesis
// with inline citations, organized by source layer (Torah → Talmud → later).

import { useRef, useState } from 'react';
import { useEncounters } from '@/app/_lib/encounters-store';
import { useSparks } from '@/app/_lib/sparks-store';
import { api } from '@/app/_lib/api';
import type { LibraryResult } from '@/app/_lib/types';

type Phase = 'idle' | 'searching' | 'synthesizing' | 'done';

export function ScholarPanel() {
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [sourceCount, setSourceCount] = useState(0);
  const [sources, setSources] = useState<LibraryResult[]>([]);
  const [answer, setAnswer] = useState('');
  const [showSources, setShowSources] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [savedAnswer, setSavedAnswer] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const { encounters, patch, refresh } = useEncounters();
  const { create: createSpark } = useSparks();

  const handleAsk = async () => {
    if (!question.trim() || phase === 'searching' || phase === 'synthesizing') return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase('searching');
    setSourceCount(0);
    setSources([]);
    setAnswer('');
    setShowSources(false);

    try {
      const res = await fetch('/api/sources/scholar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error('Scholar request failed');
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No stream');
      const decoder = new TextDecoder();
      let buffer = '';
      let inAnswer = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process status lines
        while (buffer.includes('\n')) {
          const nlIdx = buffer.indexOf('\n');
          const line = buffer.substring(0, nlIdx);
          buffer = buffer.substring(nlIdx + 1);

          if (line === '__STATUS:searching__') {
            setPhase('searching');
          } else if (line.startsWith('__STATUS:found:')) {
            const count = parseInt(line.replace('__STATUS:found:', '').replace('__', ''));
            setSourceCount(count);
          } else if (line === '__STATUS:synthesizing__') {
            setPhase('synthesizing');
          } else if (line.startsWith('__SOURCES:')) {
            try {
              const json = line.replace('__SOURCES:', '').replace(/__$/, '');
              setSources(JSON.parse(json));
            } catch {}
          } else if (line === '__ANSWER__') {
            inAnswer = true;
            setPhase('done');
          } else if (inAnswer) {
            setAnswer((prev) => prev + line + '\n');
          }
        }

        // If we're in the answer phase, stream the remaining buffer too
        if (inAnswer && buffer) {
          setAnswer((prev) => prev + buffer);
          buffer = '';
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setAnswer('Something went wrong. Please try again.');
      setPhase('done');
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setPhase('idle');
    setQuestion('');
    setAnswer('');
    setSources([]);
    setSourceCount(0);
    setShowSources(false);
  };

  const isWorking = phase === 'searching' || phase === 'synthesizing';

  return (
    <div className="scholar-panel">
      <button
        className="scholar-toggle"
        onClick={() => setExpanded((v) => !v)}>
        <span className="scholar-toggle-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
          </svg>
        </span>
        <span className="scholar-toggle-label">Scholar</span>
        <span className="scholar-toggle-sub">Ask a question — get a comprehensive, source-cited answer</span>
        <span className="scholar-toggle-arrow">{expanded ? '▾' : '▸'}</span>
      </button>

      {expanded && (
        <div className="scholar-body">
          <div className="scholar-input-row">
            <textarea
              className="scholar-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); }
              }}
              placeholder="Ask anything — Why do we wear a kippah? What is the basis for birchat hamazon? How does the Talmud discuss the afterlife?"
              rows={2}
              disabled={isWorking}
            />
            <button
              className="btn primary"
              onClick={handleAsk}
              disabled={isWorking || !question.trim()}
              style={{ alignSelf: 'flex-end' }}>
              {isWorking ? '...' : 'Ask'}
            </button>
            {(question || answer) && !isWorking && (
              <button
                className="btn ghost small"
                onClick={handleReset}
                style={{ alignSelf: 'flex-end' }}
                title="Clear">
                <span className="icon" style={{ width: 14, height: 14 }}>×</span>
              </button>
            )}
          </div>

          {/* Status indicators */}
          {phase !== 'idle' && (
            <div className="scholar-status">
              <div className={`scholar-phase${phase === 'searching' ? ' active' : ' done'}`}>
                <span className="scholar-phase-dot" />
                <span>Searching sources</span>
                {sourceCount > 0 && <span className="scholar-phase-count">{sourceCount} found</span>}
              </div>
              <div className={`scholar-phase${phase === 'synthesizing' ? ' active' : phase === 'done' ? ' done' : ''}`}>
                <span className="scholar-phase-dot" />
                <span>Synthesizing answer</span>
              </div>
            </div>
          )}

          {/* Answer */}
          {answer && (
            <div className="scholar-answer">
              <div className="scholar-answer-text">
                {answer.split('\n').map((line, i) => (
                  line.trim() ? <p key={i}>{line}</p> : null
                ))}
              </div>
              <div className="scholar-answer-actions">
                <button className="btn ghost small" onClick={handleCopy}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  className="btn ghost small"
                  onClick={async () => {
                    await createSpark({ body: `Q: ${question}\n\n${answer}`, tag: 'Scholar' });
                    setSavedAnswer(true);
                    setTimeout(() => setSavedAnswer(false), 2000);
                  }}>
                  {savedAnswer ? 'Saved' : 'To Sparks'}
                </button>
                {encounters.length > 0 && (
                  <select
                    className="input"
                    style={{ width: 'auto', padding: '4px 8px', fontSize: 11 }}
                    defaultValue=""
                    onChange={async (e) => {
                      if (!e.target.value) return;
                      await patch(e.target.value, {
                        appendTranscript: `\n\n--- Scholar: ${question} ---\n${answer}`,
                      });
                      refresh();
                      e.target.value = '';
                    }}>
                    <option value="" disabled>Save to file...</option>
                    {encounters.map((enc) => (
                      <option key={enc.id} value={enc.id}>{enc.congregantName}</option>
                    ))}
                  </select>
                )}
                {sources.length > 0 && (
                  <button className="btn ghost small" onClick={() => setShowSources((v) => !v)}>
                    {showSources ? 'Hide' : 'Show'} {sources.length} sources
                  </button>
                )}
                <button className="btn ghost small" onClick={handleReset}>
                  New question
                </button>
              </div>
            </div>
          )}

          {/* Source cards */}
          {showSources && sources.length > 0 && (
            <div className="scholar-sources">
              {sources.map((s, i) => (
                <div key={i} className="scholar-source">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <div className="scholar-source-ref">{s.ref}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="btn ghost small"
                        style={{ fontSize: 10, padding: '2px 6px', minHeight: 0 }}
                        onClick={async () => {
                          await createSpark({ body: `${s.ref}\n${s.en || s.he}`, tag: 'Source' });
                        }}>
                        Spark
                      </button>
                      {encounters.length > 0 && (
                        <select
                          className="input"
                          style={{ width: 'auto', padding: '2px 6px', fontSize: 10 }}
                          defaultValue=""
                          onChange={async (e) => {
                            if (!e.target.value) return;
                            await patch(e.target.value, {
                              addSource: { ref: s.ref, he: s.he, en: s.en, addedAt: new Date().toISOString() },
                            });
                            refresh();
                            e.target.value = '';
                          }}>
                          <option value="" disabled>→ File</option>
                          {encounters.map((enc) => (
                            <option key={enc.id} value={enc.id}>{enc.congregantName}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  {s.en && <div className="scholar-source-text">{s.en.substring(0, 200)}{s.en.length > 200 ? '...' : ''}</div>}
                  {s.relevance && <div className="scholar-source-why">{s.relevance}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
