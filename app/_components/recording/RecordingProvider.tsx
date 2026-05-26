'use client';
// Holds an in-flight recording session so it survives route navigation.
// Mounted once in AppShell. Exposes the recorder + the active fileId.

import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { useRecorder, Recorder, RecordedMoment } from './useRecorder';

export interface RecordingSession {
  fileId: string;
  startedAt: string;
  /** Audit field — typed by the rabbi during the vow phase. */
  consentName: string;
}

interface RecordingCtx extends Recorder {
  session: RecordingSession | null;
  /** Called after vow phase: begins recording for this file. */
  begin: (session: Omit<RecordingSession, 'startedAt'>) => Promise<boolean>;
  /** Drop a marker at the current elapsed time AND persist as a Spark. */
  markMomentWithSpark: (label?: string) => Promise<RecordedMoment | null>;
}

const Ctx = createContext<RecordingCtx | null>(null);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const recorder = useRecorder();
  const [session, setSession] = useState<RecordingSession | null>(null);

  const begin: RecordingCtx['begin'] = useCallback(async (s) => {
    const ok = await recorder.start();
    if (ok) {
      setSession({ ...s, startedAt: new Date().toISOString() });
    }
    return ok;
  }, [recorder]);

  // Sparks-as-markers: each ⚑ drop creates a Spark via existing /api/sparks.
  const markMomentWithSpark: RecordingCtx['markMomentWithSpark'] = useCallback(async (label) => {
    if (!session) return null;
    const m = recorder.markMoment(label);
    try {
      await fetch('/api/sparks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: label || `Marked at ${fmt(m.t)}`,
          tag: 'Moment',
          fileId: session.fileId,
          momentT: m.t,
        }),
      });
    } catch (err) {
      console.error('[recording] mark moment failed:', err);
    }
    return m;
  }, [recorder, session]);

  // Wrap stop to also clear the session AFTER the blob is in hand.
  // (Callers can still use recorder.stop directly — they'll get the blob.)
  const wrappedStop = useCallback(async () => {
    const blob = await recorder.stop();
    setSession(null);
    return blob;
  }, [recorder]);

  return (
    <Ctx.Provider value={{
      ...recorder,
      stop: wrappedStop,
      session,
      begin,
      markMomentWithSpark,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useRecordingSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRecordingSession must be used inside <RecordingProvider>');
  return ctx;
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
