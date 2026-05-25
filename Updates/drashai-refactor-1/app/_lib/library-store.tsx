'use client';
// Library store — query state + saved sources + folders + suggested searches.
// All the library-page state that lived inline in old page.tsx, now isolated.
// Preserves your recent additions: libFolders, libActiveFolder, suggestedSearches with
// deletable chips, showAllSuggested toggle.

import { createContext, ReactNode, useContext, useState } from 'react';
import type { LibraryResult, SavedSource, SuggestedSearch } from './types';

const DEFAULT_FOLDERS = ['General', 'Sermons', 'Eulogies', 'Teachings'];

const DEFAULT_SUGGESTED: SuggestedSearch[] = [
  { label: 'Love', q: 'love' },
  { label: 'Mourning', q: 'mourning' },
  { label: 'Justice', q: 'justice' },
  { label: 'Kindness', q: 'kindness' },
  { label: 'Faith', q: 'faith' },
  { label: 'Shabbat', q: 'shabbat' },
  { label: 'Repentance', q: 'repentance' },
  { label: 'Peace', q: 'peace' },
  { label: 'Wisdom', q: 'wisdom' },
  { label: 'Gratitude', q: 'gratitude' },
];

interface LibraryStore {
  query: string;
  setQuery: (v: string) => void;
  results: LibraryResult[];
  setResults: React.Dispatch<React.SetStateAction<LibraryResult[]>>;
  searching: boolean;
  setSearching: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;

  saved: SavedSource[];
  setSaved: React.Dispatch<React.SetStateAction<SavedSource[]>>;
  folders: string[];
  setFolders: React.Dispatch<React.SetStateAction<string[]>>;
  activeFolder: string | null;
  setActiveFolder: (v: string | null) => void;

  text: LibraryResult | null;
  setText: (v: LibraryResult | null) => void;
  loadingText: boolean;
  setLoadingText: (v: boolean) => void;

  browse: string | null;
  setBrowse: (v: string | null) => void;

  suggested: SuggestedSearch[];
  setSuggested: React.Dispatch<React.SetStateAction<SuggestedSearch[]>>;
  showAllSuggested: boolean;
  setShowAllSuggested: (v: boolean) => void;
}

const Ctx = createContext<LibraryStore | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LibraryResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<SavedSource[]>([]);
  const [folders, setFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [text, setText] = useState<LibraryResult | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [browse, setBrowse] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<SuggestedSearch[]>(DEFAULT_SUGGESTED);
  const [showAllSuggested, setShowAllSuggested] = useState(false);

  return (
    <Ctx.Provider
      value={{
        query, setQuery,
        results, setResults,
        searching, setSearching,
        error, setError,
        saved, setSaved,
        folders, setFolders,
        activeFolder, setActiveFolder,
        text, setText,
        loadingText, setLoadingText,
        browse, setBrowse,
        suggested, setSuggested,
        showAllSuggested, setShowAllSuggested,
      }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}
