'use client';
// Dictation modal — record voice, transcribe via ElevenLabs, optionally refine
// with Claude, then insert into the draft composer.
// Adapted from MedScribe's dictation pipeline for rabbinical use.

import { useCallback, useEffect, useRef, useState } from 'react';
import { I } from '@/app/_components/Icons';
import { api } from '@/app/_lib/api';
import {
  loadDictationSettings,
  convertPunctuation,
  removeFillers,
} from '@/app/_lib/dictation-settings';

type Stage = 'idle' | 'recording' | 'transcribing' | 'refining' | 'done';

export interface DictationResult {
  raw: string;
  refined: string;
  mode: 'replace' | 'append';
}

export function DictationModal({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (result: DictationResult) => void;
}) {
  const [stage, setStage] = useState<Stage>('idle');
  const [time, setTime] = useState(0);
  const [level, setLevel] = useState(0);
  const [rawText, setRawText] = useState('');
  const [refinedText, setRefinedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const settings = useRef(loadDictationSettings());

  // Cleanup on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    try { audioCtxRef.current?.close(); } catch {}
    if (recorderRef.current?.state !== 'inactive') {
      try {
        recorderRef.current?.stop();
        recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      } catch {}
    }
  }, []);

  const startLevelLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    let smoothed = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      const next = Math.min(rms * 3, 1);
      smoothed = smoothed * 0.8 + next * 0.2;
      setLevel(smoothed);
      levelRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;

      // Audio level
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      startLevelLoop();

      setTime(0);
      setStage('recording');
      timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
    } catch (err) {
      setError('Microphone access denied. Check browser permissions.');
    }
  }, [startLevelLoop]);

  const stopRecording = useCallback(async () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (levelRafRef.current) { cancelAnimationFrame(levelRafRef.current); levelRafRef.current = null; }
    setLevel(0);

    const recorder = recorderRef.current;
    if (!recorder) return;

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
      };
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });
    recorderRef.current = null;
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;

    // Transcribe
    setStage('transcribing');
    try {
      const { text } = await api.transcribe(blob, 'dictation');
      let processed = text;

      // Post-processing
      const s = settings.current;
      if (s.removeFillerWords) processed = removeFillers(processed, s.fillerWords);
      if (s.convertSpokenPunctuation) processed = convertPunctuation(processed);

      setRawText(processed);

      // Refine with Claude
      if (s.refineEnabled) {
        setStage('refining');
        try {
          const res = await fetch('/api/dictation/refine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: processed, prompt: s.refinePrompt }),
          });
          if (res.ok) {
            const refined = await res.text();
            if (refined && refined !== 'EMPTY') {
              setRefinedText(refined);
            } else {
              setRefinedText(processed);
            }
          } else {
            setRefinedText(processed);
          }
        } catch {
          setRefinedText(processed);
        }
      } else {
        setRefinedText(processed);
      }

      setStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
      setStage('idle');
    }
  }, []);

  const handleInsert = () => {
    const text = editing ? refinedText : refinedText || rawText;
    onInsert({ raw: rawText, refined: text, mode: settings.current.insertMode });
    onClose();
  };

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Waveform bars
  const bars = 24;
  const waveformBars = Array.from({ length: bars }, (_, i) => {
    const center = bars / 2;
    const dist = Math.abs(i - center) / center;
    const envelope = Math.exp(-dist * dist * 2);
    const base = 0.08;
    const height = base + level * envelope * 0.92;
    return height;
  });

  return (
    <div className="modal-shroud" onClick={onClose}>
      <div className="modal dictation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-eyebrow">Voice dictation</div>
        <h2 className="modal-title">הכתבה</h2>
        <div className="modal-title-en">Dictate into your draft</div>

        {/* Recording / Processing state */}
        <div className="dictation-stage">
          {stage === 'idle' && (
            <div className="dictation-idle">
              <button className="dictation-record-btn" onClick={startRecording}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                  <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
                <span>Tap to dictate</span>
              </button>
              <div className="dictation-hint">
                Speak naturally. Hebrew, English, or mixed — the AI will clean it up.
              </div>
            </div>
          )}

          {stage === 'recording' && (
            <div className="dictation-recording">
              <div className="dictation-waveform">
                {waveformBars.map((h, i) => (
                  <div
                    key={i}
                    className="dictation-waveform-bar"
                    style={{ height: `${h * 100}%` }}
                  />
                ))}
              </div>
              <div className="dictation-time">{fmtTime(time)}</div>
              <button className="dictation-stop-btn" onClick={stopRecording}>
                <div className="dictation-stop-icon" />
                <span>Done</span>
              </button>
            </div>
          )}

          {(stage === 'transcribing' || stage === 'refining') && (
            <div className="dictation-processing">
              <div className="dictation-processing-dots">
                <span/><span/><span/>
              </div>
              <div className="dictation-processing-label">
                {stage === 'transcribing' ? 'Transcribing…' : 'Refining…'}
              </div>
            </div>
          )}

          {stage === 'done' && (
            <div className="dictation-result">
              <div className="dictation-result-label">
                {settings.current.refineEnabled ? 'Refined' : 'Transcribed'}
              </div>
              {editing ? (
                <textarea
                  className="input serif dictation-result-editor"
                  value={refinedText}
                  onChange={(e) => setRefinedText(e.target.value)}
                  rows={6}
                  autoFocus
                />
              ) : (
                <div className="dictation-result-text" data-selectable="true">
                  {(refinedText || rawText).split('\n\n').map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}

              {rawText !== refinedText && !editing && (
                <details className="dictation-raw">
                  <summary>Show raw transcription</summary>
                  <div className="dictation-raw-text">{rawText}</div>
                </details>
              )}

              <div className="dictation-result-actions">
                <button className="btn ghost small" onClick={() => setEditing((v) => !v)}>
                  {editing ? 'Preview' : 'Edit'}
                </button>
                <button className="btn ghost small" onClick={() => {
                  setStage('idle');
                  setRawText('');
                  setRefinedText('');
                  setEditing(false);
                }}>
                  <span className="icon" style={{ width: 14, height: 14 }}>{I.mic}</span>
                  Re-record
                </button>
                <div style={{ flex: 1 }} />
                <button className="btn primary" onClick={handleInsert}>
                  Insert into draft
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="dictation-error">{error}</div>
          )}
        </div>

        {/* Close */}
        <button
          className="btn ghost small"
          style={{ position: 'absolute', top: 16, right: 16 }}
          onClick={onClose}>
          <span className="icon" style={{ width: 14, height: 14 }}>{I.x}</span>
        </button>
      </div>
    </div>
  );
}
