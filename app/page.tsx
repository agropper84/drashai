'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────
interface Encounter {
  id: string;
  congregantName: string;
  date: string;
  topic?: string;
  type?: string;
  typeHeb?: string;
  status?: string;
  sealed?: boolean;
  transcript: string;
  notes: string;
  generatedContent?: { type: string; content: string; generatedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

type View = 'home' | 'file' | 'settings' | 'sparks' | 'templates' | 'library';
type FileTab = 'transcript' | 'documents' | 'sources' | 'insights' | 'draft' | 'final';

const FILE_TYPES = [
  { key: 'hesped', heb: 'הספד', en: 'Eulogy' },
  { key: 'drasha', heb: 'דרשה', en: 'Sermon' },
  { key: 'dvar_torah', heb: 'דבר תורה', en: "D'var Torah" },
  { key: 'bar_mitzvah', heb: 'בר/בת מצוה', en: 'Bar/Bat Mitzvah' },
  { key: 'wedding', heb: 'נישואין', en: 'Wedding' },
  { key: 'letter', heb: 'מכתב', en: 'Pastoral Letter' },
  { key: 'study', heb: 'לימוד', en: 'Study Notes' },
];

const DRAFT_TYPES = [
  { key: 'sermon', label: 'Sermon' },
  { key: 'eulogy', label: 'Eulogy' },
  { key: 'teaching', label: 'Teaching' },
  { key: 'dvar_torah', label: "D'var Torah" },
  { key: 'pastoral_letter', label: 'Pastoral Letter' },
  { key: 'meeting_summary', label: 'Summary' },
];

// ─── SVG Icons (inline, matching design) ─────────────────
const I = {
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1z"/><path d="M9 21V12h6v9"/></svg>,
  scroll: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h12a2 2 0 002-2V7a2 2 0 00-2-2H8"/><path d="M4 3h4v18H4a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="1" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 01-14 0v-1"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
  copy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6m4-6v6"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  spark: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L9 12l-7 1 5.5 5L6 22l6-4 6 4-1.5-4L22 13l-7-1z"/></svg>,
  book: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  templ: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  pause: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  play: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  stop: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5M5 17h14l-1.5-6.5a1 1 0 00-1-.5H7.5a1 1 0 00-1 .5z"/><path d="M15 4L9 4l-1 6h8z"/></svg>,
  share: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  print: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
};

// ─── Main App ────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [view, setView] = useState<View>('home');
  const [openFileId, setOpenFileId] = useState<string | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showNew, setShowNew] = useState(false);
  const [showRec, setShowRec] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [sourceQuery, setSourceQuery] = useState('');
  const [sourceTab, setSourceTab] = useState('all');
  const [recPhase, setRecPhase] = useState<'vow' | 'recording' | 'review'>('vow');
  const [recConsent, setRecConsent] = useState(false);
  const [recTranscript, setRecTranscript] = useState('');
  const [recPaused, setRecPaused] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const recTimerRef = useRef<NodeJS.Timeout>(undefined);

  // Theme
  const [theme, setTheme] = useState('warm');
  const [mode, setMode] = useState('light');

  // Sparks (global insights)
  const [sparks, setSparks] = useState<{ id: string; body: string; tag: string; when: string }[]>([]);
  const [newSpark, setNewSpark] = useState('');

  // File detail
  const [activeTab, setActiveTab] = useState<FileTab>('transcript');

  // Settings
  const [claudeKey, setClaudeKey] = useState('');
  const [elevenKey, setElevenKey] = useState('');
  const [savingKeys, setSavingKeys] = useState(false);
  const [keysSaved, setKeysSaved] = useState(false);
  const [hasClaudeKey, setHasClaudeKey] = useState(false);

  // New file form
  const [newType, setNewType] = useState('hesped');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Draft generation
  const [aiMode, setAiMode] = useState<'heavy' | 'collab' | 'light'>('collab');
  const [draftType, setDraftType] = useState('sermon');
  const [draftInstructions, setDraftInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [copied, setCopied] = useState(false);

  // Transcript editing
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [notes, setNotes] = useState('');
  const [savingField, setSavingField] = useState(false);
  const notesTimer = useRef<NodeJS.Timeout>(undefined);

  const activeFile = encounters.find(e => e.id === openFileId) || null;

  // ─── Auth + Data fetch ──────────────────────────────────
  const fetchEncounters = useCallback(async () => {
    try {
      const res = await fetch('/api/rav/encounters');
      if (res.status === 401) { setAuthed(false); setLoading(false); return; }
      setAuthed(true);
      if (res.ok) {
        const data = await res.json();
        setEncounters(data.encounters || []);
      }
    } catch { setAuthed(false); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEncounters(); }, [fetchEncounters]);

  useEffect(() => {
    if (authed) {
      fetch('/api/settings').then(r => r.ok ? r.json() : null).then(d => {
        if (d) setHasClaudeKey(!!d.hasClaudeKey);
      }).catch(() => {});
    }
  }, [authed]);

  // Sync file fields
  useEffect(() => {
    if (activeFile) {
      setTranscriptDraft(activeFile.transcript || '');
      setNotes(activeFile.notes || '');
      setStreamedContent('');
    }
  }, [openFileId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When opening a file, switch view
  useEffect(() => {
    if (openFileId) setView('file');
  }, [openFileId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSources(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Theme switching
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (mode !== 'auto') document.documentElement.setAttribute('data-mode', mode);
    else document.documentElement.removeAttribute('data-mode');
  }, [theme, mode]);

  // Recording timer
  const startRecTimer = () => {
    setRecTime(0);
    recTimerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
  };
  const stopRecTimer = () => { if (recTimerRef.current) clearInterval(recTimerRef.current); };
  const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── API helpers ────────────────────────────────────────
  const saveField = async (field: string, value: string) => {
    if (!openFileId) return;
    setSavingField(true);
    try {
      const res = await fetch(`/api/rav/encounters/${openFileId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setEncounters(prev => prev.map(e => e.id === openFileId ? data.encounter : e));
      }
    } catch {} finally { setSavingField(false); }
  };

  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => saveField('notes', text), 1000);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const typeInfo = FILE_TYPES.find(t => t.key === newType);
    try {
      const res = await fetch('/api/rav/encounters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          congregantName: newName.trim(),
          topic: typeInfo?.en,
          type: newType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEncounters(prev => [data.encounter, ...prev]);
        setOpenFileId(data.encounter.id);
        setNewName(''); setShowNew(false);
      }
    } catch {} finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/rav/encounters/${id}`, { method: 'DELETE' });
    setEncounters(prev => prev.filter(e => e.id !== id));
    if (openFileId === id) { setOpenFileId(null); setView('home'); }
  };

  const handleGenerate = async () => {
    if (!activeFile?.transcript?.trim()) return;
    setGenerating(true); setStreamedContent('');
    try {
      const res = await fetch('/api/rav/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: activeFile.transcript, notes: activeFile.notes,
          type: draftType, instructions: draftInstructions.trim() || undefined,
          congregantName: activeFile.congregantName,
        }),
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
      // Save
      await fetch(`/api/rav/encounters/${openFileId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addGenerated: { type: draftType, content: full, generatedAt: new Date().toISOString() } }),
      });
      fetchEncounters();
    } catch (e: any) { setStreamedContent(`Error: ${e.message}`); }
    finally { setGenerating(false); }
  };

  const handleSaveKeys = async () => {
    setSavingKeys(true);
    try {
      const body: Record<string, string> = {};
      if (claudeKey) body.claudeApiKey = claudeKey;
      if (elevenKey) body.elevenlabsApiKey = elevenKey;
      await fetch('/api/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setKeysSaved(true);
      setHasClaudeKey(!!claudeKey || hasClaudeKey);
      setTimeout(() => setKeysSaved(false), 2000);
      setClaudeKey(''); setElevenKey('');
    } catch {} finally { setSavingKeys(false); }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // ─── Loading ────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div className="mono" style={{ color: 'var(--ink-3)' }}>Loading...</div>
      </div>
    );
  }

  // ─── Login ──────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)' }}>
        <div style={{ width: '100%', maxWidth: 380, margin: '0 16px', textAlign: 'center' }}>
          <div className="brand-mark" style={{ width: 56, height: 56, fontSize: 32, margin: '0 auto 16px', borderRadius: 10 }}>רב</div>
          <h1 className="heb-display" style={{ fontSize: 36, margin: '0 0 4px' }}>דרש AI</h1>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', fontStyle: 'italic', marginBottom: 32 }}>Encounter Recorder & Content Generator</p>
          <a href="/api/auth/login" className="btn primary" style={{ width: '100%', justifyContent: 'center', padding: '14px 20px', fontSize: 15 }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
          </a>
        </div>
      </div>
    );
  }

  // ─── Main App ───────────────────────────────────────────
  return (
    <div className="app">
      {/* ─── Sidebar ─── */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">רב</div>
          <div className="nav-label">
            <div className="brand-name">Drash AI</div>
            <div className="brand-sub">דרש AI</div>
          </div>
        </div>

        <div className="nav-section">Workspace</div>

        {[
          { key: 'home', icon: I.home, en: 'Files', heb: 'תיקים' },
          { key: 'sparks', icon: I.spark, en: 'Sparks', heb: 'ניצוצות' },
          { key: 'templates', icon: I.templ, en: 'Templates', heb: 'תבניות' },
          { key: 'library', icon: I.book, en: 'Library', heb: 'ספרייה' },
          { key: 'settings', icon: I.settings, en: 'Settings', heb: 'הגדרות' },
        ].map(item => (
          <button key={item.key} className={`nav-item ${view === item.key && !openFileId ? 'active' : ''}`}
            onClick={() => { setView(item.key as View); setOpenFileId(null); }}>
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">
              <span className="en">{item.en}</span>
              <span className="heb">{item.heb}</span>
            </span>
          </button>
        ))}

        {/* Recent files */}
        {encounters.length > 0 && (
          <>
            <div className="nav-section" style={{ marginTop: 12 }}>Recent</div>
            {encounters.slice(0, 3).map(enc => (
              <button key={enc.id} className={`nav-item ${openFileId === enc.id ? 'active' : ''}`}
                onClick={() => setOpenFileId(enc.id)}>
                <span className="nav-icon">{I.scroll}</span>
                <span className="nav-label">
                  <span className="en" style={{ fontSize: 13 }}>{enc.congregantName}</span>
                  <span style={{ fontSize: 10, color: 'var(--ink-3)' }}>{enc.topic || enc.date}</span>
                </span>
              </button>
            ))}
          </>
        )}

        <div className="sidebar-foot">
          <a href="/api/auth/logout" className="nav-item" style={{ color: 'var(--ink-3)' }}>
            <span className="nav-icon">{I.logout}</span>
            <span className="nav-label"><span className="en">Sign Out</span></span>
          </a>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="main">
        <div className="main-inner">

          {/* ═══ HOME SCREEN ═══ */}
          {view === 'home' && !openFileId && (
            <>
              <div className="page-head">
                <div className="page-title-wrap">
                  <div className="page-eyebrow">Your encounters</div>
                  <h1 className="page-title heb-display">תיקים</h1>
                  <div className="page-title-en">Files</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn" onClick={() => { setShowRec(true); setRecPhase('vow'); setRecConsent(false); setRecTranscript(''); }}>
                    <span className="icon">{I.mic}</span> Quick Record
                  </button>
                  <button className="btn primary" onClick={() => setShowNew(true)}>
                    <span className="icon">{I.plus}</span> New File
                  </button>
                </div>
              </div>

              {encounters.length === 0 ? (
                <div className="empty-state">
                  <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📜</div>
                  <p style={{ fontSize: 18 }}>No encounters yet</p>
                  <p style={{ fontSize: 14, marginTop: 8 }}>Create your first file to begin</p>
                  <button className="btn primary" style={{ marginTop: 20 }} onClick={() => setShowNew(true)}>
                    <span className="icon">{I.plus}</span> New File
                  </button>
                </div>
              ) : (
                <div className="file-grid">
                  {encounters.map(enc => {
                    const typeInfo = FILE_TYPES.find(t => t.key === enc.type);
                    return (
                      <div key={enc.id} className="card file-card" onClick={() => setOpenFileId(enc.id)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div className="file-type">{typeInfo?.en || enc.topic || 'Encounter'}</div>
                          {enc.sealed && <span className="badge sealed"><span className="icon" style={{ width: 11, height: 11 }}>{I.lock}</span> Sealed</span>}
                          {(enc.generatedContent?.length || 0) > 0 && !enc.sealed && <span className="badge draft">Draft</span>}
                        </div>
                        <div className="file-title-heb">{typeInfo?.heb || ''}</div>
                        <div className="file-title-en">{enc.congregantName}</div>
                        <div className="file-meta">
                          <div className={`status-dot ${enc.generatedContent?.length ? 'active' : ''}`} />
                          <span>{enc.date}</span>
                          <span className="dot" />
                          {enc.transcript ? <span>{enc.transcript.split('\n').length} lines</span> : <span>No transcript</span>}
                        </div>
                        <button className="btn ghost small" style={{ position: 'absolute', top: 8, right: 8, minHeight: 28, minWidth: 28, padding: 4 }}
                          onClick={e => { e.stopPropagation(); handleDelete(enc.id); }}>
                          <span className="icon" style={{ width: 14, height: 14 }}>{I.trash}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ═══ FILE DETAIL ═══ */}
          {view === 'file' && activeFile && (
            <>
              <div className="crumb">
                <button onClick={() => { setOpenFileId(null); setView('home'); }}>Files</button>
                <span className="crumb-sep">›</span>
                <span>{activeFile.congregantName}</span>
              </div>

              <div className="file-detail-head">
                <div>
                  <div className="page-eyebrow">{FILE_TYPES.find(t => t.key === activeFile.type)?.en || activeFile.topic || 'Encounter'}</div>
                  <h1 className="file-detail-title">{FILE_TYPES.find(t => t.key === activeFile.type)?.heb || ''}</h1>
                  <div className="file-detail-en">{activeFile.congregantName}</div>
                  <div className="file-detail-meta-row">
                    <span>{activeFile.date}</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs">
                {[
                  { key: 'transcript', en: 'Conversation', heb: 'שיחה' },
                  { key: 'documents', en: 'Documents', heb: 'מסמכים' },
                  { key: 'sources', en: 'Sources', heb: 'מקורות' },
                  { key: 'insights', en: 'Insights', heb: 'ניצוצות' },
                  { key: 'draft', en: 'Draft', heb: 'טיוטה' },
                  { key: 'final', en: 'Final', heb: 'סופי' },
                ].map(tab => (
                  <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key as FileTab)}>
                    <span className="en">{tab.en}</span>
                  </button>
                ))}
              </div>

              {/* ── Transcript Tab ── */}
              {activeTab === 'transcript' && (
                <div>
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">שיחה</h2>
                      <div className="section-title-en">Conversation</div>
                    </div>
                    <button className="btn small" onClick={() => { setShowRec(true); setRecPhase('vow'); setRecConsent(false); setRecTranscript(''); }}>
                      <span className="icon">{I.mic}</span> Record
                    </button>
                  </div>

                  {/* Display formatted transcript if it has speaker labels */}
                  {activeFile.transcript && activeFile.transcript.includes(':') ? (
                    <div className="transcript" style={{ marginBottom: 20 }}>
                      {activeFile.transcript.split('\n').filter(l => l.trim()).map((line, i) => {
                        const colonIdx = line.indexOf(':');
                        const hasSpeaker = colonIdx > 0 && colonIdx < 30;
                        const speaker = hasSpeaker ? line.substring(0, colonIdx).trim() : '';
                        const text = hasSpeaker ? line.substring(colonIdx + 1).trim() : line;
                        return (
                          <div key={i} className="utterance">
                            <div className="utterance-time">{String(Math.floor(i * 0.5)).padStart(2, '0')}:{String((i * 30) % 60).padStart(2, '0')}</div>
                            <div>
                              {speaker && <span className="utterance-speaker">{speaker}</span>}
                              <div className="utterance-text">{text}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  <textarea className="input serif" rows={8} value={transcriptDraft}
                    onChange={e => setTranscriptDraft(e.target.value)}
                    placeholder="Paste or type the encounter transcript here...&#10;&#10;Format with speaker labels:&#10;Rabbi: How are you feeling today?&#10;David: We've been thinking a lot about mom..." />
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn primary" onClick={() => saveField('transcript', transcriptDraft)}
                      disabled={savingField}>
                      {savingField ? 'Saving...' : 'Save Transcript'}
                    </button>
                  </div>

                  <hr className="divider" />

                  <div className="section-head">
                    <div>
                      <h2 className="section-title" style={{ fontSize: 24 }}>הערות</h2>
                      <div className="section-title-en">Private Notes</div>
                    </div>
                  </div>
                  <textarea className="input serif" rows={4} value={notes}
                    onChange={e => handleNotesChange(e.target.value)}
                    placeholder="Your private notes, themes to explore, relevant parsha connections..." />
                </div>
              )}

              {/* ── Draft Tab ── */}
              {activeTab === 'draft' && (
                <div className="composer">
                  <div>
                    {/* Toolbar */}
                    <div className="toolbar">
                      <button className="icon-btn" title="Bold"><span className="icon" style={{ width: 16, height: 16, fontWeight: 700, fontFamily: 'serif', fontSize: 14 }}>B</span></button>
                      <button className="icon-btn" title="Italic"><span className="icon" style={{ width: 16, height: 16, fontStyle: 'italic', fontFamily: 'serif', fontSize: 14 }}>I</span></button>
                      <button className="icon-btn" title="Block Quote"><span className="icon" style={{ width: 16, height: 16, fontSize: 14 }}>&ldquo;</span></button>
                      <div className="divider-v" />
                      <button className="icon-btn" title="Hebrew text"><span className="icon heb" style={{ width: 16, height: 16, fontSize: 13 }}>עב</span></button>
                      <button className="icon-btn" title="Insert source"><span className="icon" style={{ width: 16, height: 16 }}>{I.book}</span></button>
                      <div style={{ flex: 1 }} />
                      <button className="btn ghost small" onClick={() => handleCopy(streamedContent || activeFile.generatedContent?.[activeFile.generatedContent.length - 1]?.content || '')}>
                        <span className="icon" style={{ width: 14, height: 14 }}>{I.copy}</span> Copy
                      </button>
                    </div>

                    {/* Composer paper */}
                    {streamedContent ? (
                      <div className="composer-paper grain" style={{ position: 'relative' }}>
                        <h2 className="composer-h heb-display">{FILE_TYPES.find(t => t.key === activeFile.type)?.heb || 'טיוטה'}</h2>
                        <div className="composer-h-en">{activeFile.congregantName}</div>
                        <div className="composer-body">
                          {streamedContent.split('\n\n').map((para, i) => (
                            <p key={i} className={i === 0 ? 'first-cap' : ''} style={{ whiteSpace: 'pre-wrap' }}>{para}</p>
                          ))}
                        </div>
                      </div>
                    ) : activeFile.generatedContent?.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {activeFile.generatedContent.map((g, i) => (
                          <div key={i} className="composer-paper grain" style={{ position: 'relative' }}>
                            <div className="mono" style={{ color: 'var(--gold)', marginBottom: 16, textAlign: 'center' }}>
                              {g.type.replace('_', ' ')} — {new Date(g.generatedAt).toLocaleDateString()}
                            </div>
                            <div className="composer-body">
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
                    ) : (
                      <div className="composer-paper grain" style={{ position: 'relative' }}>
                        <div className="empty-state" style={{ padding: 60 }}>
                          <p style={{ fontSize: 18 }}>Begin writing, or generate from the panel →</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aside panel */}
                  <div className="aside">
                    {/* AI Mode */}
                    <div className="aside-card">
                      <div className="aside-h">AI Assist</div>
                      <div className="ai-modes">
                        {[
                          { key: 'heavy', ico: '🤖', label: 'Heavy' },
                          { key: 'collab', ico: '🤝', label: 'Collab' },
                          { key: 'light', ico: '✍️', label: 'Light' },
                        ].map(m => (
                          <button key={m.key} className={`ai-mode ${aiMode === m.key ? 'active' : ''}`}
                            onClick={() => setAiMode(m.key as typeof aiMode)}>
                            <span className="ico">{m.ico}</span>{m.label}
                          </button>
                        ))}
                      </div>
                      <div className="ai-status">
                        {aiMode === 'heavy' ? 'AI drafts fully, you refine and approve' :
                         aiMode === 'collab' ? 'You write together — AI suggests, you decide' :
                         'You write, AI assists only when asked'}
                      </div>
                    </div>

                    {/* Generate */}
                    <div className="aside-card">
                      <div className="aside-h">Generate</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        {DRAFT_TYPES.map(dt => (
                          <button key={dt.key} className={`btn small ${draftType === dt.key ? 'primary' : ''}`}
                            style={{ justifyContent: 'flex-start' }}
                            onClick={() => setDraftType(dt.key)}>
                            {dt.label}
                          </button>
                        ))}
                      </div>
                      <textarea className="input serif" rows={2} value={draftInstructions}
                        onChange={e => setDraftInstructions(e.target.value)}
                        placeholder="Focus on themes of..." style={{ marginBottom: 12, minHeight: 60 }} />
                      <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }}
                        onClick={handleGenerate}
                        disabled={generating || !activeFile.transcript?.trim()}>
                        {generating ? 'Generating...' : `Generate ${DRAFT_TYPES.find(d => d.key === draftType)?.label}`}
                      </button>
                      {!activeFile.transcript?.trim() && (
                        <p style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', marginTop: 8 }}>
                          Add a transcript first in the Conversation tab.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Documents Tab ── */}
              {activeTab === 'documents' && (
                <div>
                  <div className="section-head">
                    <div><h2 className="section-title">מסמכים</h2><div className="section-title-en">Documents</div></div>
                    <button className="btn small"><span className="icon">{I.plus}</span> Upload</button>
                  </div>
                  <div className="dropzone">
                    <span className="icon" style={{ width: 32, height: 32, display: 'block', margin: '0 auto 8px', color: 'var(--ink-3)' }}>{I.doc}</span>
                    <p style={{ fontSize: 15 }}>Drop files here or click to upload</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>PDFs, photos, notes, condolence letters</p>
                  </div>
                </div>
              )}

              {/* ── Sources Tab ── */}
              {activeTab === 'sources' && (
                <div>
                  <div className="section-head">
                    <div><h2 className="section-title">מקורות</h2><div className="section-title-en">Sources</div></div>
                    <button className="btn small" onClick={() => setShowSources(true)}><span className="icon">{I.search}</span> Find Source</button>
                  </div>
                  <div className="empty-state" style={{ padding: 40 }}>
                    <p style={{ fontSize: 18 }}>No sources linked yet</p>
                    <p style={{ fontSize: 14, marginTop: 8 }}>Search Torah, Talmud, Midrash and personal library to attach relevant texts</p>
                    <button className="btn primary" style={{ marginTop: 16 }} onClick={() => setShowSources(true)}>
                      <span className="icon">{I.search}</span> Search Sources
                    </button>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 12 }}>
                      <span className="kbd">⌘K</span> to search from anywhere
                    </p>
                  </div>
                </div>
              )}

              {/* ── Insights Tab ── */}
              {activeTab === 'insights' && (
                <div>
                  <div className="section-head">
                    <div><h2 className="section-title">ניצוצות</h2><div className="section-title-en">Insights & Sparks</div></div>
                    <button className="btn small"><span className="icon">{I.plus}</span> New Spark</button>
                  </div>
                  <div className="empty-state" style={{ padding: 40 }}>
                    <p style={{ fontSize: 18 }}>No sparks yet for this file</p>
                    <p style={{ fontSize: 14, marginTop: 8 }}>Capture insights, themes, and ideas as you work</p>
                  </div>
                </div>
              )}

              {/* ── Final Tab ── */}
              {activeTab === 'final' && (
                <div>
                  <div className="section-head">
                    <div><h2 className="section-title">סופי</h2><div className="section-title-en">Final Version</div></div>
                  </div>
                  {activeFile.generatedContent?.length ? (
                    <div>
                      <div className="composer-paper" style={{ maxWidth: '60ch', margin: '0 auto' }}>
                        <div className="composer-body" style={{ minHeight: 200 }}>
                          <p style={{ whiteSpace: 'pre-wrap' }}>{activeFile.generatedContent[activeFile.generatedContent.length - 1].content}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
                        <button className="btn" onClick={() => handleCopy(activeFile.generatedContent![activeFile.generatedContent!.length - 1].content)}>
                          <span className="icon">{I.copy}</span> Copy
                        </button>
                        <button className="btn" onClick={() => window.print()}>
                          <span className="icon">{I.print}</span> Print
                        </button>
                        <button className="btn">
                          <span className="icon">{I.share}</span> Share
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: 40 }}>
                      <p style={{ fontSize: 18 }}>No final version yet</p>
                      <p style={{ fontSize: 14, marginTop: 8 }}>Generate a draft first, then mark it as final</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ═══ SPARKS SCREEN ═══ */}
          {view === 'sparks' && !openFileId && (
            <>
              <div className="page-head">
                <div className="page-title-wrap">
                  <div className="page-eyebrow">Capture before it fades</div>
                  <h1 className="page-title heb-display">ניצוצות</h1>
                  <div className="page-title-en">Sparks</div>
                </div>
                <button className="btn primary" onClick={() => {
                  if (newSpark.trim()) {
                    setSparks(prev => [{ id: crypto.randomUUID(), body: newSpark, tag: 'Thought', when: new Date().toLocaleDateString() }, ...prev]);
                    setNewSpark('');
                  }
                }}>
                  <span className="icon">{I.plus}</span> Capture
                </button>
              </div>
              <div style={{ marginBottom: 20 }}>
                <textarea className="input serif" rows={2} value={newSpark} onChange={e => setNewSpark(e.target.value)}
                  placeholder="A fleeting thought, a connection, an image that spoke to you..." />
              </div>
              {sparks.length === 0 ? (
                <div className="empty-state">
                  <p style={{ fontSize: 18 }}>Your sparks inbox is empty</p>
                  <p style={{ fontSize: 14, marginTop: 8 }}>Capture ideas, fragments, and connections before they fade</p>
                </div>
              ) : (
                <div className="insight-grid">
                  {sparks.map(s => (
                    <div key={s.id} className="insight-card card">
                      <div className="insight-tag">{s.tag}</div>
                      <div className="insight-body">{s.body}</div>
                      <div className="insight-foot">{s.when}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ═══ TEMPLATES SCREEN ═══ */}
          {view === 'templates' && !openFileId && (
            <>
              <div className="page-head">
                <div className="page-title-wrap">
                  <div className="page-eyebrow">Document structures</div>
                  <h1 className="page-title heb-display">תבניות</h1>
                  <div className="page-title-en">Templates</div>
                </div>
              </div>
              <div className="template-grid">
                {[
                  { heb: 'הספד', en: 'Eulogy (Hesped)', sections: 'Opening, Life story, Character, Torah, Closing', desc: 'A framework for honoring the departed' },
                  { heb: 'דרשה', en: 'Sermon (Drasha)', sections: 'Hook, Text, Teaching, Application, Call', desc: 'Shabbat or holiday sermon structure' },
                  { heb: 'דבר תורה', en: "D'var Torah", sections: 'Text, Question, Insight, Connection', desc: 'Concise Torah teaching' },
                  { heb: 'בר/בת מצוה', en: 'Bar/Bat Mitzvah', sections: 'Welcome, Torah portion, Personal, Blessing', desc: 'Coming of age celebration' },
                  { heb: 'נישואין', en: 'Wedding Remarks', sections: 'Couple story, Torah, Blessings, Charge', desc: 'Under the chuppah' },
                  { heb: 'מכתב', en: 'Pastoral Letter', sections: 'Greeting, Acknowledgment, Guidance, Blessing', desc: 'Condolence or pastoral care' },
                  { heb: 'לימוד', en: 'Study Notes', sections: 'Source, Analysis, Questions, Application', desc: 'Personal learning journal' },
                ].map((t, i) => (
                  <div key={i} className="card template-card">
                    <div className="template-name">{t.heb}</div>
                    <div className="template-en">{t.en}</div>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>{t.desc}</p>
                    <div className="template-sections">{t.sections}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ═══ LIBRARY SCREEN ═══ */}
          {view === 'library' && !openFileId && (
            <>
              <div className="page-head">
                <div className="page-title-wrap">
                  <div className="page-eyebrow">Texts & references</div>
                  <h1 className="page-title heb-display">ספרייה</h1>
                  <div className="page-title-en">Library</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div className="card" style={{ padding: 22 }}>
                  <div className="mono" style={{ color: 'var(--gold)', marginBottom: 8 }}>Sefaria</div>
                  <p style={{ fontSize: 20, fontWeight: 600 }}>Jewish Texts</p>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>Search Torah, Talmud, Midrash, and more via Sefaria&apos;s library</p>
                  <button className="btn small" style={{ marginTop: 12 }}><span className="icon">{I.search}</span> Search</button>
                </div>
                <div className="card" style={{ padding: 22 }}>
                  <div className="mono" style={{ color: 'var(--gold)', marginBottom: 8 }}>Personal</div>
                  <p style={{ fontSize: 20, fontWeight: 600 }}>My Library</p>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>Your uploaded notes, books, and personal source collection</p>
                  <button className="btn small" style={{ marginTop: 12 }}><span className="icon">{I.plus}</span> Upload</button>
                </div>
              </div>
            </>
          )}

          {/* ═══ SETTINGS ═══ */}
          {view === 'settings' && (
            <>
              <div className="page-head">
                <div className="page-title-wrap">
                  <div className="page-eyebrow">Configuration</div>
                  <h1 className="page-title heb-display">הגדרות</h1>
                  <div className="page-title-en">Settings</div>
                </div>
              </div>

              {/* AI Keys */}
              <div className="settings-section">
                <h2 className="settings-h">מפתחות AI</h2>
                <div className="settings-h-en">API Keys</div>
                <div className="settings-block">
                  <div className="settings-row settings-row-stack">
                    <div>
                      <div className="settings-label">Anthropic (Claude)</div>
                      <div className="settings-help">
                        Required for generating sermons, eulogies, and other content.{' '}
                        <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                          Get your API key →
                        </a>
                      </div>
                    </div>
                    <div className="key-input" style={{ marginTop: 8 }}>
                      <input className="input" type="password" value={claudeKey}
                        onChange={e => setClaudeKey(e.target.value)}
                        placeholder={hasClaudeKey ? '••••••••••••••••' : 'sk-ant-...'} />
                      <span className={`key-status ${hasClaudeKey ? 'connected' : 'empty'}`}>
                        {hasClaudeKey ? '● Connected' : '○ Not set'}
                      </span>
                    </div>
                  </div>
                  <div className="settings-row settings-row-stack">
                    <div>
                      <div className="settings-label">ElevenLabs</div>
                      <div className="settings-help">
                        For voice transcription (Scribe v2 with speaker diarization).{' '}
                        <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>
                          Get your API key →
                        </a>
                      </div>
                    </div>
                    <div className="key-input" style={{ marginTop: 8 }}>
                      <input className="input" type="password" value={elevenKey}
                        onChange={e => setElevenKey(e.target.value)}
                        placeholder="xi-..." />
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <button className="btn primary" onClick={handleSaveKeys} disabled={savingKeys || (!claudeKey && !elevenKey)}>
                      {keysSaved ? '✓ Saved' : savingKeys ? 'Saving...' : 'Save Keys'}
                    </button>
                  </div>
                  <div className="privacy-vow" style={{ marginTop: 14 }}>
                    <div className="privacy-vow-title">
                      <span className="icon" style={{ width: 12, height: 12 }}>{I.lock}</span> Security
                    </div>
                    <p style={{ fontSize: 14 }}>API keys are stored encrypted in your account. They never leave the server and are only used to make API calls on your behalf.</p>
                  </div>
                </div>
              </div>

              {/* Appearance */}
              <div className="settings-section">
                <h2 className="settings-h">מראה</h2>
                <div className="settings-h-en">Appearance</div>
                <div className="settings-block">
                  <div className="settings-label" style={{ marginBottom: 12 }}>Theme</div>
                  <div className="theme-grid">
                    {[
                      { key: 'warm', label: 'Warm', sub: 'Parchment & oxblood', colors: ['#f0e7d2', '#7a2e2a', '#a87a2c'] },
                      { key: 'cool', label: 'Cool', sub: 'Stone & slate', colors: ['#e8ebf0', '#2f4866', '#6d6a4a'] },
                      { key: 'sacred', label: 'Sacred', sub: 'Deep night & gold', colors: ['#1b2038', '#d4a955', '#8aa07a'] },
                    ].map(t => (
                      <button key={t.key} className={`theme-card ${theme === t.key ? 'active' : ''}`}
                        onClick={() => setTheme(t.key)}>
                        <div className="theme-card-preview" style={{ display: 'flex' }}>
                          {t.colors.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
                        </div>
                        <div className="theme-card-label">{t.label}</div>
                        <div className="theme-card-sub">{t.sub}</div>
                        {theme === t.key && <span className="check" style={{ position: 'absolute', top: 10, right: 10, width: 16, height: 16 }}>{I.check}</span>}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div className="settings-label" style={{ marginBottom: 8 }}>Mode</div>
                    <div className="mode-toggle">
                      {['light', 'dark', 'auto'].map(m => (
                        <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
                          {m === 'light' ? '☀' : m === 'dark' ? '🌙' : '⚙'} {m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prompts */}
              <div className="settings-section">
                <h2 className="settings-h">הנחיות</h2>
                <div className="settings-h-en">Prompts</div>
                <div className="settings-block">
                  <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
                    Customize the AI prompts used for each document type. Use <code className="mono" style={{ fontSize: 10, padding: '1px 4px', background: 'var(--bg-sunken)', borderRadius: 3 }}>{'{{transcript}}'}</code> for the conversation and <code className="mono" style={{ fontSize: 10, padding: '1px 4px', background: 'var(--bg-sunken)', borderRadius: 3 }}>{'{{subject}}'}</code> for the congregant name.
                  </p>
                  {[
                    { label: 'Eulogy (Hesped)', key: 'hesped' },
                    { label: 'Sermon (Drasha)', key: 'drasha' },
                    { label: 'Source Finding', key: 'sources' },
                    { label: 'Pastoral Letter', key: 'letter' },
                  ].map(p => (
                    <div key={p.key} style={{ marginBottom: 16 }}>
                      <div className="settings-label" style={{ marginBottom: 6 }}>{p.label}</div>
                      <div className="prompt-block" contentEditable suppressContentEditableWarning
                        style={{ minHeight: 60 }}>
                        {'Based on the following encounter transcript with {{subject}}, create a ' + p.label.toLowerCase() + ' that draws on themes from the conversation and incorporates relevant Torah references...'}
                      </div>
                    </div>
                  ))}
                  <button className="btn ghost small" style={{ marginTop: 4 }}>Restore defaults</button>
                </div>
              </div>

              {/* Privacy */}
              <div className="settings-section">
                <h2 className="settings-h">חיסיון</h2>
                <div className="settings-h-en">Privacy</div>
                <div className="settings-block">
                  <div className="settings-row">
                    <div>
                      <div className="settings-label">Apply pastoral seal by default</div>
                      <div className="settings-help">New encounters are sealed automatically</div>
                    </div>
                    <div className="mode-toggle"><button className="active">On</button><button>Off</button></div>
                  </div>
                  <div className="settings-row">
                    <div>
                      <div className="settings-label">Auto-redact names on export</div>
                      <div className="settings-help">Replace congregant names with initials when sharing</div>
                    </div>
                    <div className="mode-toggle"><button className="active">On</button><button>Off</button></div>
                  </div>
                </div>
              </div>

              {/* Account */}
              <div className="settings-section">
                <h2 className="settings-h">חשבון</h2>
                <div className="settings-h-en">Account</div>
                <div className="settings-block">
                  <div className="settings-row">
                    <div>
                      <div className="settings-label">Signed in</div>
                      <div className="settings-help">via Google OAuth</div>
                    </div>
                    <a href="/api/auth/logout" className="btn small" style={{ color: 'var(--accent)' }}>Sign Out</a>
                  </div>
                </div>
              </div>
            </>
          )}

        </div>
      </main>

      {/* ═══ RECORDING MODAL ═══ */}
      {showRec && (
        <div className="modal-shroud" onClick={() => { setShowRec(false); stopRecTimer(); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {/* Vow Phase */}
            {recPhase === 'vow' && (
              <>
                <div className="modal-eyebrow">Pastoral recording</div>
                <h2 className="modal-title">הקלטה</h2>
                <div className="modal-title-en">Begin Recording</div>
                <div className="privacy-vow">
                  <div className="privacy-vow-title">
                    <span className="icon" style={{ width: 12, height: 12 }}>{I.lock}</span> Pastoral Seal
                  </div>
                  <p>This recording is made in the context of pastoral care. It is sealed and will be stored securely on your device only.</p>
                  <span className="heb-quote">לֹא תֵלֵךְ רָכִיל בְּעַמֶּיךָ</span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, fontSize: 14, color: 'var(--ink-1)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={recConsent} onChange={e => setRecConsent(e.target.checked)} />
                  I have informed the participant(s) that this conversation is being recorded
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                  <button className="btn ghost" onClick={() => setShowRec(false)}>Cancel</button>
                  <button className="btn primary" disabled={!recConsent}
                    onClick={() => { setRecPhase('recording'); startRecTimer(); }}>
                    <span className="icon">{I.mic}</span> Begin
                  </button>
                </div>
              </>
            )}

            {/* Recording Phase */}
            {recPhase === 'recording' && (
              <>
                <div className="modal-eyebrow">Recording in progress</div>
                <div className={`rec-vis ${recPaused ? 'paused' : ''}`}>
                  <div className="rec-time">{fmtTime(recTime)}</div>
                  <div className="rec-rec-pill"><span className="dot" /> REC</div>
                  <div className="rec-waveform">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div key={i} className="rec-bar" style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.05}s` }} />
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <textarea className="input serif" rows={4} value={recTranscript}
                    onChange={e => setRecTranscript(e.target.value)}
                    placeholder="Live transcript will appear here... (or type/paste)" />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'space-between' }}>
                  <button className="btn" onClick={() => setRecPaused(!recPaused)}>
                    <span className="icon">{recPaused ? I.play : I.pause}</span> {recPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button className="btn primary" onClick={() => { stopRecTimer(); setRecPhase('review'); }}>
                    <span className="icon">{I.stop}</span> End & Save
                  </button>
                </div>
              </>
            )}

            {/* Review Phase */}
            {recPhase === 'review' && (
              <>
                <div className="modal-eyebrow">Recording complete</div>
                <h2 className="modal-title">הוקלט</h2>
                <div className="modal-title-en">Sealed & Saved</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0' }}>
                  <span className="badge sealed"><span className="icon">{I.lock}</span> Sealed on device</span>
                  <span className="mono" style={{ color: 'var(--ink-3)' }}>{fmtTime(recTime)}</span>
                </div>
                {recTranscript && (
                  <div className="card" style={{ padding: 16, marginBottom: 16 }}>
                    <p style={{ fontSize: 14, color: 'var(--ink-2)', whiteSpace: 'pre-wrap' }}>
                      {recTranscript.substring(0, 200)}{recTranscript.length > 200 ? '...' : ''}
                    </p>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="btn ghost" onClick={() => setShowRec(false)}>Close</button>
                  {openFileId && recTranscript && (
                    <button className="btn primary" onClick={async () => {
                      await fetch(`/api/rav/encounters/${openFileId}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ appendTranscript: recTranscript }),
                      });
                      fetchEncounters();
                      setShowRec(false);
                    }}>
                      Save to File
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ SOURCE SEARCH MODAL ═══ */}
      {showSources && (
        <div className="modal-shroud" onClick={() => setShowSources(false)}>
          <div className="modal wide" onClick={e => e.stopPropagation()}>
            <div className="modal-eyebrow">Find & attach</div>
            <h2 className="modal-title">חיפוש מקורות</h2>
            <div className="modal-title-en">Search Sources</div>

            <div className="search-row">
              <input className="search-input" value={sourceQuery} onChange={e => setSourceQuery(e.target.value)}
                placeholder="Search Torah, Talmud, Midrash..." autoFocus />
              <button className="btn primary"><span className="icon">{I.search}</span></button>
            </div>

            <div style={{ display: 'flex', gap: 4, marginBottom: 18, overflowX: 'auto' }}>
              {['all', 'tanakh', 'talmud', 'midrash', 'commentary', 'my library'].map(tab => (
                <button key={tab} className={`tab ${sourceTab === tab ? 'active' : ''}`}
                  style={{ padding: '8px 12px', fontSize: 13 }}
                  onClick={() => setSourceTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Sample results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { cite: 'Bereishit 1:27', heb: 'וַיִּבְרָא אֱלֹהִים אֶת הָאָדָם בְּצַלְמוֹ', en: 'And God created man in His image', lib: 'Sefaria' },
                { cite: 'Pirkei Avot 1:14', heb: 'אִם אֵין אֲנִי לִי מִי לִי', en: 'If I am not for myself, who will be for me?', lib: 'Sefaria' },
                { cite: 'Kohelet 3:1', heb: 'לַכֹּל זְמָן וְעֵת לְכָל חֵפֶץ תַּחַת הַשָּׁמָיִם', en: 'To everything there is a season, and a time to every purpose under the heaven', lib: 'Sefaria' },
              ].filter(() => !sourceQuery || true).map((s, i) => (
                <div key={i} className="search-result">
                  <div>
                    <div className="source-cite">{s.cite}</div>
                    <div className="source-heb" style={{ fontSize: 18, marginBottom: 4 }}>{s.heb}</div>
                    <div className="source-en" style={{ fontSize: 14 }}>{s.en}</div>
                    <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 6 }}>{s.lib}</div>
                  </div>
                  <button className="btn small primary">Attach</button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-sunken)', borderRadius: 6 }}>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                🔍 AI will suggest sources based on themes detected in your conversation transcript
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn ghost" onClick={() => setShowSources(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ NEW FILE MODAL ═══ */}
      {showNew && (
        <div className="modal-shroud" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-eyebrow">New encounter</div>
            <h2 className="modal-title">תיק חדש</h2>
            <div className="modal-title-en">Create a new file</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {FILE_TYPES.map(ft => (
                <button key={ft.key}
                  className={`btn small ${newType === ft.key ? 'primary' : ''}`}
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => setNewType(ft.key)}>
                  <span className="heb" style={{ fontSize: 14 }}>{ft.heb}</span>
                  <span style={{ fontSize: 12, color: newType === ft.key ? 'inherit' : 'var(--ink-3)' }}>{ft.en}</span>
                </button>
              ))}
            </div>

            <input className="input serif" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Name (e.g., Goldberg Family)" autoFocus
              onKeyDown={e => e.key === 'Enter' && handleCreate()} />

            <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
              <button className="btn ghost" onClick={() => setShowNew(false)}>Cancel</button>
              <button className="btn primary" onClick={handleCreate} disabled={creating || !newName.trim()}>
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
