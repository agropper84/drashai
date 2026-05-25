'use client';
// MediaRecorder hook — extracted from the old App's recording state.
// Reusable for: pastoral encounter recording, spark voice notes, future features.
// Plan 9 builds the sticky-bar UI on top of this; the hook stays the same.

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Recorder {
  recording: boolean;
  paused: boolean;
  time: number;                 // seconds since start (excluding pauses)
  start: () => Promise<boolean>;
  stop: () => Promise<Blob | null>;
  pause: () => void;
  resume: () => void;
}

export function useRecorder(): Recorder {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      setTime(0);
      setRecording(true);
      setPaused(false);
      startTimer();
      return true;
    } catch (err) {
      console.error('[useRecorder] start failed:', err);
      return false;
    }
  }, [startTimer]);

  const stop = useCallback(async () => {
    stopTimer();
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
      setRecording(false);
      setPaused(false);
    });
  }, [stopTimer]);

  const pause = useCallback(() => {
    const r = recorderRef.current;
    if (!r || r.state !== 'recording') return;
    r.pause();
    setPaused(true);
    stopTimer();
  }, [stopTimer]);

  const resume = useCallback(() => {
    const r = recorderRef.current;
    if (!r || r.state !== 'paused') return;
    r.resume();
    setPaused(false);
    startTimer();
  }, [startTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  return { recording, paused, time, start, stop, pause, resume };
}

export function fmtTime(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
