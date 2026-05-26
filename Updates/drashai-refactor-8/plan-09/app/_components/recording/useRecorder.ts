'use client';
// Plan 9 upgrade — exposes an audio-level signal (0..1) for the ethereal vis,
// and a moments array for ⚑ markers.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface RecordedMoment {
  t: number;        // seconds since recording start
  label?: string;
  createdAt: string;
}

export interface Recorder {
  recording: boolean;
  paused: boolean;
  time: number;
  /** 0..1 — smoothed RMS of the mic input. */
  level: number;
  /** Markers dropped during recording. */
  moments: RecordedMoment[];
  start: () => Promise<boolean>;
  stop: () => Promise<Blob | null>;
  pause: () => void;
  resume: () => void;
  /** Drop a marker at the current elapsed time. */
  markMoment: (label?: string) => RecordedMoment;
  /** Replace or annotate the last marker. */
  updateMoment: (idx: number, patch: Partial<RecordedMoment>) => void;
}

export function useRecorder(): Recorder {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [level, setLevel] = useState(0);
  const [moments, setMoments] = useState<RecordedMoment[]>([]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafRef = useRef<number | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  }, [stopTimer]);

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
      // Smooth + scale (mic input rarely exceeds 0.3 RMS even when loud).
      const next = Math.min(rms * 3, 1);
      smoothed = smoothed * 0.8 + next * 0.2;
      setLevel(smoothed);
      levelRafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stopLevelLoop = useCallback(() => {
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      recorderRef.current = recorder;

      // Audio level analyzer
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new AC();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      startLevelLoop();

      setTime(0);
      setMoments([]);
      setRecording(true);
      setPaused(false);
      startTimer();
      return true;
    } catch (err) {
      console.error('[useRecorder] start failed:', err);
      return false;
    }
  }, [startTimer, startLevelLoop]);

  const stop = useCallback(async () => {
    stopTimer();
    stopLevelLoop();
    const recorder = recorderRef.current;
    if (!recorder) return null;
    return new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        resolve(blob);
      };
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
      recorderRef.current = null;
      try { audioCtxRef.current?.close(); } catch {}
      audioCtxRef.current = null;
      analyserRef.current = null;
      setRecording(false);
      setPaused(false);
    });
  }, [stopTimer, stopLevelLoop]);

  const pause = useCallback(() => {
    const r = recorderRef.current;
    if (!r || r.state !== 'recording') return;
    r.pause();
    setPaused(true);
    stopTimer();
    stopLevelLoop();
  }, [stopTimer, stopLevelLoop]);

  const resume = useCallback(() => {
    const r = recorderRef.current;
    if (!r || r.state !== 'paused') return;
    r.resume();
    setPaused(false);
    startTimer();
    startLevelLoop();
  }, [startTimer, startLevelLoop]);

  const markMoment = useCallback((label?: string) => {
    const m: RecordedMoment = {
      t: time,
      label,
      createdAt: new Date().toISOString(),
    };
    setMoments((prev) => [...prev, m]);
    return m;
  }, [time]);

  const updateMoment = useCallback((idx: number, patch: Partial<RecordedMoment>) => {
    setMoments((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }, []);

  useEffect(() => () => {
    stopTimer();
    stopLevelLoop();
  }, [stopTimer, stopLevelLoop]);

  return {
    recording, paused, time, level, moments,
    start, stop, pause, resume, markMoment, updateMoment,
  };
}

export function fmtTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
