'use client';
// One context provider that any component anywhere can use to open a modal.
// Replaces 3 useState booleans + their setters scattered through old App.
//
// Usage:
//   const { open, close } = useModal();
//   <button onClick={() => open('record', { fileId: file.id })}>Record</button>

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from 'react';
import { NewFileModal } from './NewFileModal';
import { RecordingModal } from './RecordingModal';
import { SourceModal } from './SourceModal';
import { DictationModal, DictationResult } from './DictationModal';
import { HelpModal } from './HelpModal';

type ModalKind = 'new' | 'record' | 'sources' | 'dictation' | 'help';

interface OpenOptions {
  /** When recording: which file (if any) the recording should append to. */
  fileId?: string;
  /** When dictation: callback to insert the result into the composer. */
  onDictationInsert?: (result: DictationResult) => void;
}

interface ModalCtx {
  open: (kind: ModalKind, opts?: OpenOptions) => void;
  close: () => void;
  /** The currently-open modal's options, or null. */
  options: OpenOptions | null;
}

const Ctx = createContext<ModalCtx | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ModalKind | null>(null);
  const [options, setOptions] = useState<OpenOptions | null>(null);

  const open: ModalCtx['open'] = useCallback((kind, opts = {}) => {
    setOptions(opts);
    setActive(kind);
  }, []);

  const close: ModalCtx['close'] = useCallback(() => {
    setActive(null);
    setOptions(null);
  }, []);

  return (
    <Ctx.Provider value={{ open, close, options }}>
      {children}
      {active === 'new' && <NewFileModal onClose={close} />}
      {active === 'record' && <RecordingModal onClose={close} fileId={options?.fileId} />}
      {active === 'sources' && <SourceModal onClose={close} />}
      {active === 'help' && <HelpModal onClose={close} />}
      {active === 'dictation' && (
        <DictationModal
          onClose={close}
          onInsert={(result) => {
            options?.onDictationInsert?.(result);
            close();
          }}
        />
      )}
    </Ctx.Provider>
  );
}

export function useModal() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useModal must be used inside <ModalProvider>');
  return ctx;
}
