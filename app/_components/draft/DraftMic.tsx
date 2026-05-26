'use client';
// Subtle mic button for the draft paper. Two interaction modes:
//   Tap:  toggle recording on/off — inserts raw transcription
//   Hold: record while held, release auto-processes (transcribe + refine + insert)

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/app/_lib/api';
import {
  loadDictationSettings,
  convertPunctuation,
  removeFillers,
} from '@/app/_lib/dictation-settings';

type Stage = 'idle' | 'recording' | 'processing';

export function DraftMic({ onInsert }: { onInsert: (text: string) => void }) {
  const [stage, setStage] = useState<Stage>('idle');
  const [level, setLevel] = useState(0);
  const holdRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafRef = useRef<number | null>(null);
  const shouldRefineRef = useRef(false);

  useEffect(() => () => {
    if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    try { audioCtxRef.current?.close(); } catch {}
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
      smoothed = smoothed * 0.75 + Math.min(Math.sqrt(sum / buf.length) * 3, 1) * 0.25;
      setLevel(smoothed);
      levelRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stopLevel = useCallback(() => {
    if (levelRafRef.current) { cancelAnimationFrame(levelRafRef.current); levelRafRef.current = null; }
    setLevel(0);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000);
      recorderRef.current = recorder;

      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      startLevelLoop();

      setStage('recording');
    } catch {
      // mic denied — silently fail
    }
  }, [startLevelLoop]);

  const stopAndProcess = useCallback(async (refine: boolean) => {
    stopLevel();
    const recorder = recorderRef.current;
    if (!recorder) { setStage('idle'); return; }

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });
    recorderRef.current = null;
    try { audioCtxRef.current?.close(); } catch {}
    audioCtxRef.current = null;
    analyserRef.current = null;

    setStage('processing');
    try {
      const { text } = await api.transcribe(blob, 'dictation');
      const s = loadDictationSettings();
      let processed = text;
      if (s.removeFillerWords) processed = removeFillers(processed, s.fillerWords);
      if (s.convertSpokenPunctuation) processed = convertPunctuation(processed);

      if (refine && s.refineEnabled) {
        try {
          const res = await fetch('/api/dictation/refine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: processed, prompt: s.refinePrompt }),
          });
          if (res.ok) {
            const refined = await res.text();
            if (refined && refined !== 'EMPTY') processed = refined;
          }
        } catch {}
      }
      onInsert(processed);
    } catch {}
    setStage('idle');
  }, [onInsert, stopLevel]);

  // Tap: toggle on/off (no refinement)
  // Hold (>300ms): record while held, refine on release
  const handlePointerDown = useCallback(() => {
    if (stage === 'processing') return;

    if (stage === 'recording') {
      // Tap off — stop without refinement
      shouldRefineRef.current = false;
      stopAndProcess(false);
      return;
    }

    // Start a hold timer — if released before 300ms it's a tap
    holdRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      holdRef.current = true;
      shouldRefineRef.current = true;
    }, 300);
    startRecording();
  }, [stage, startRecording, stopAndProcess]);

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
    if (stage !== 'recording') return;

    if (holdRef.current) {
      // Was a hold — stop and refine
      stopAndProcess(true);
    }
    // If not a hold (tap), recording stays on — user taps again to stop
  }, [stage, stopAndProcess]);

  // Ring animation scale
  const ringScale = stage === 'recording' ? 1 + level * 0.6 : 1;

  return (
    <button
      className={`draft-mic${stage === 'recording' ? ' recording' : ''}${stage === 'processing' ? ' processing' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        // If pointer leaves while holding, treat as release
        if (holdRef.current && stage === 'recording') {
          if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
          stopAndProcess(true);
        }
      }}
      title={stage === 'idle' ? 'Tap to dictate · hold for auto-refine' : stage === 'recording' ? 'Tap to stop' : 'Processing…'}
      disabled={stage === 'processing'}
    >
      <span className="draft-mic-ring" style={{ transform: `scale(${ringScale})` }} />
      {stage === 'processing' ? (
        <span className="draft-mic-dots"><span/><span/><span/></span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
          <path d="M19 10v2a7 7 0 01-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
        </svg>
      )}
    </button>
  );
}
