'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ───────────────────────────────────────────────
interface EncounterSource { ref: string; heRef?: string; he: string; en: string; note?: string; addedAt: string }

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
  sources?: EncounterSource[];
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

// ─── Hebrew Initials ─────────────────────────────────────
const HEB_MAP: Record<string, string> = {
  A:'א', B:'ב', C:'כ', D:'ד', E:'א', F:'פ', G:'ג', H:'ה', I:'י', J:'י',
  K:'כ', L:'ל', M:'מ', N:'נ', O:'ע', P:'פ', Q:'ק', R:'ר', S:'ש', T:'ת',
  U:'א', V:'ו', W:'ו', X:'כ', Y:'י', Z:'ז',
};
function hebrewInitials(name: string): string {
  if (!name) return 'דא';
  const parts = name.trim().split(/\s+/);
  const first = (parts[0]?.[0] || '').toUpperCase();
  const last = (parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] || '').toUpperCase();
  return (HEB_MAP[first] || 'א') + (HEB_MAP[last] || 'א');
}

// ─── Main App ────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userName, setUserName] = useState('');
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
  const [sourceResults, setSourceResults] = useState<{ ref: string; heRef: string; he: string; en: string; categories: string[] }[]>([]);
  const [searchingSource, setSearchingSource] = useState(false);
  const [recPhase, setRecPhase] = useState<'vow' | 'recording' | 'review'>('vow');
  const [recConsent, setRecConsent] = useState(false);
  const [recTranscript, setRecTranscript] = useState('');
  const [recPaused, setRecPaused] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const recTimerRef = useRef<NodeJS.Timeout>(undefined);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [transcribing, setTranscribing] = useState(false);

  // Theme
  const [theme, setTheme] = useState('warm');
  const [mode, setMode] = useState('light');

  // Sparks (global insights)
  const [sparks, setSparks] = useState<{ id: string; body: string; tag: string; when: string; url?: string; category?: string }[]>([]);
  const [newSpark, setNewSpark] = useState('');
  const [sparkRecording, setSparkRecording] = useState(false);
  const [sparkTranscribing, setSparkTranscribing] = useState(false);
  const sparkRecorderRef = useRef<MediaRecorder | null>(null);
  const sparkChunksRef = useRef<Blob[]>([]);
  const [sparkSelected, setSparkSelected] = useState<Set<string>>(new Set());
  const [editingSpark, setEditingSpark] = useState<string | null>(null);
  const [editSparkText, setEditSparkText] = useState('');
  const [sparkFilter, setSparkFilter] = useState('all');
  const [sparkSearching, setSparkSearching] = useState<string | null>(null);

  const SPARK_CATEGORIES = ['Uncategorized', 'Sermon', 'Eulogy', 'Teaching', 'Personal', 'Torah', 'Story', 'Quote'];

  // Templates
  interface Template {
    id: string; heb: string; en: string; sections: string; desc: string; prompt: string; builtIn?: boolean;
    fullBody?: string; // Full template text (not just outline — the actual document skeleton)
    styleDocuments?: { name: string; url: string; excerpt?: string }[]; // Uploaded style examples
    variables?: string[]; // Which context to include: 'transcript', 'notes', 'documents', 'sparks', 'sources'
  }
  const DEFAULT_TEMPLATES: Template[] = [
    { id: 'hesped', heb: 'הספד', en: 'Eulogy (Hesped)', sections: 'Opening, Life story, Character, Torah, Closing', desc: 'A framework for honoring the departed', prompt: 'Based on the encounter transcript with {{subject}}, create a eulogy that honors their life, incorporates personal stories shared by the family, includes relevant Torah references about loss and legacy, and balances grief with celebration of life. Structure: Opening acknowledgment → Life story and character → Torah wisdom → Closing blessing.', builtIn: true, variables: ['transcript', 'notes', 'sparks'] },
    { id: 'drasha', heb: 'דרשה', en: 'Sermon (Drasha)', sections: 'Hook, Text, Teaching, Application, Call', desc: 'Shabbat or holiday sermon structure', prompt: 'Based on the encounter transcript and notes, create a sermon that draws on themes from the conversation, connects to Torah/Talmud teachings, is accessible to a general congregation, and includes practical application. Structure: Hook → Torah text → Teaching/insight → Application to daily life → Call to action.', builtIn: true },
    { id: 'dvar_torah', heb: 'דבר תורה', en: "D'var Torah", sections: 'Text, Question, Insight, Connection', desc: 'Concise Torah teaching', prompt: 'Based on the encounter and notes, create a concise D\'var Torah that centers on a specific Torah portion, raises a question, offers a fresh insight, and connects to the themes discussed. Keep it focused and impactful (500-800 words).', builtIn: true },
    { id: 'bar_mitzvah', heb: 'בר/בת מצוה', en: 'Bar/Bat Mitzvah', sections: 'Welcome, Torah portion, Personal, Blessing', desc: 'Coming of age celebration', prompt: 'Based on the encounter transcript with the family, create bar/bat mitzvah remarks that welcome the community, connect to the Torah portion, highlight personal qualities of the young person, and offer a meaningful blessing for their journey.', builtIn: true },
    { id: 'wedding', heb: 'נישואין', en: 'Wedding Remarks', sections: 'Couple story, Torah, Blessings, Charge', desc: 'Under the chuppah', prompt: 'Based on the encounter transcript with the couple, create wedding remarks that tell their story, weave in Torah teachings about love and partnership, offer blessings, and charge them with building a Jewish home together.', builtIn: true },
    { id: 'letter', heb: 'מכתב', en: 'Pastoral Letter', sections: 'Greeting, Acknowledgment, Guidance, Blessing', desc: 'Condolence or pastoral care', prompt: 'Based on the encounter transcript, create a pastoral letter that addresses the congregant by name, acknowledges their situation with empathy, offers relevant guidance or comfort from Jewish tradition, and closes with a blessing.', builtIn: true },
    { id: 'study', heb: 'לימוד', en: 'Study Notes', sections: 'Source, Analysis, Questions, Application', desc: 'Personal learning journal', prompt: 'Based on the encounter and notes, create structured study notes that identify the key source texts discussed, analyze their meaning, raise questions for further exploration, and note practical applications.', builtIn: true },
  ];
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editTempl, setEditTempl] = useState<Template | null>(null);
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTempl, setNewTempl] = useState<Template>({ id: '', heb: '', en: '', sections: '', desc: '', prompt: '' });

  // Library
  const [libQuery, setLibQuery] = useState('');
  const [libResults, setLibResults] = useState<{ ref: string; heRef: string; he: string; en: string; categories: string[] }[]>([]);
  const [libSearching, setLibSearching] = useState(false);
  const [libSaved, setLibSaved] = useState<{ ref: string; he: string; en: string; savedAt: string }[]>([]);
  const [libBrowse, setLibBrowse] = useState<string | null>(null);
  const [libText, setLibText] = useState<{ ref: string; heRef: string; he: string; en: string } | null>(null);
  const [libLoadingText, setLibLoadingText] = useState(false);

  const searchLibrary = async (q: string) => {
    if (!q.trim()) return;
    setLibSearching(true);
    try {
      const res = await fetch(`/api/sources?q=${encodeURIComponent(q)}`);
      if (res.ok) { const data = await res.json(); setLibResults(data.results || []); }
    } catch {} finally { setLibSearching(false); }
  };

  const browseText = async (ref: string) => {
    setLibLoadingText(true); setLibText(null);
    try {
      const res = await fetch(`/api/sources?q=${encodeURIComponent(ref)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.results?.[0]) setLibText(data.results[0]);
      }
    } catch {} finally { setLibLoadingText(false); }
  };

  const toggleSparkSelect = (id: string) => {
    setSparkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const mergeSparks = () => {
    if (sparkSelected.size < 2) return;
    const selected = sparks.filter(s => sparkSelected.has(s.id));
    const merged = {
      id: crypto.randomUUID(),
      body: selected.map(s => s.body).join('\n\n---\n\n'),
      tag: 'Merged',
      when: new Date().toLocaleDateString(),
      category: selected[0].category,
      url: selected.find(s => s.url)?.url,
    };
    setSparks(prev => [merged, ...prev.filter(s => !sparkSelected.has(s.id))]);
    setSparkSelected(new Set());
  };

  const mergeSparkToFile = async (encId: string) => {
    const selected = sparks.filter(s => sparkSelected.has(s.id));
    if (selected.length === 0) return;
    const text = selected.map(s => `[Spark: ${s.tag}] ${s.body}`).join('\n\n');
    await fetch(`/api/rav/encounters/${encId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appendTranscript: '\n\n' + text }),
    });
    setSparks(prev => prev.filter(s => !sparkSelected.has(s.id)));
    setSparkSelected(new Set());
    fetchEncounters();
  };

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
  const [zenMode, setZenMode] = useState(false);
  const [userDraft, setUserDraft] = useState('');
  const [preserveLevel, setPreserveLevel] = useState(3); // 1-5: how much of user writing to keep
  const [asideCollapsed, setAsideCollapsed] = useState(false);
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
        if (d) { setHasClaudeKey(!!d.hasClaudeKey); if (d.name) setUserName(d.name); }
      }).catch(() => {});
    }
  }, [authed]);

  // Sync file fields
  useEffect(() => {
    if (activeFile) {
      setTranscriptDraft(activeFile.transcript || '');
      setNotes(activeFile.notes || '');
      setStreamedContent('');
      setUserDraft('');
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.start(1000); // collect chunks every second
      mediaRecorderRef.current = recorder;
      startRecTimer();
      setRecPaused(false);
    } catch (err) {
      console.error('Mic access denied:', err);
      setRecTranscript('Error: Microphone access denied. Please allow microphone access and try again.');
    }
  };

  const stopRecording = (): Blob | null => {
    stopRecTimer();
    const recorder = mediaRecorderRef.current;
    if (!recorder) return null;
    recorder.stop();
    recorder.stream.getTracks().forEach(t => t.stop());
    mediaRecorderRef.current = null;
    const mimeType = recorder.mimeType || 'audio/webm';
    return new Blob(chunksRef.current, { type: mimeType });
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);
      formData.append('mode', 'encounter');
      const res = await fetch('/api/transcribe-elevenlabs', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Transcription failed' }));
        setRecTranscript(prev => prev + '\n\n[Transcription error: ' + (err.error || 'unknown') + ']');
        return;
      }
      const data = await res.json();
      setRecTranscript(prev => prev ? prev + '\n\n' + data.text : data.text);
    } catch (e: any) {
      setRecTranscript(prev => prev + '\n\n[Transcription error: ' + e.message + ']');
    } finally {
      setTranscribing(false);
    }
  };

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
    const tmpl = templates.find(t => t.id === newType);
    try {
      const res = await fetch('/api/rav/encounters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          congregantName: newName.trim(),
          topic: tmpl?.en || newType,
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
      // Use template prompt + context if the file has a matching template
      const fileTemplate = templates.find(t => t.id === activeFile.type);
      const vars = fileTemplate?.variables || ['transcript', 'notes'];
      const customPrompt = fileTemplate?.prompt || undefined;
      const templateBody = fileTemplate?.fullBody || undefined;
      const styleExcerpts = fileTemplate?.styleDocuments?.map(d => d.excerpt).filter(Boolean).join('\n\n---\n\n') || undefined;
      // Gather sparks if included
      const sparkContext = vars.includes('sparks') && sparks.length > 0
        ? sparks.map(s => `[${s.tag}] ${s.body}`).join('\n') : undefined;
      const sourcesContext = vars.includes('sources') && activeFile.sources?.length
        ? activeFile.sources.map(s => `[${s.ref}]\n${s.he}\n${s.en}`).join('\n\n') : undefined;
      const res = await fetch('/api/rav/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: vars.includes('transcript') ? activeFile.transcript : undefined,
          notes: vars.includes('notes') ? activeFile.notes : undefined,
          type: draftType, instructions: draftInstructions.trim() || undefined,
          congregantName: activeFile.congregantName,
          customPrompt, templateBody, styleExcerpts, sparkContext, sourcesContext,
          userDraft: userDraft.trim() || undefined,
          preserveLevel: userDraft.trim() ? preserveLevel : undefined,
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
          <div className="brand-mark" style={{ width: 56, height: 56, fontSize: 32, margin: '0 auto 16px', borderRadius: 10 }}>דא</div>
          <h1 className="heb-display" style={{ fontSize: 36, margin: '0 0 4px' }}>דרשאי</h1>
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
          <div className="brand-mark">{hebrewInitials(userName) || 'דא'}</div>
          <div className="nav-label">
            <div className="brand-name">Drashai</div>
            <div className="brand-sub">דרשאי</div>
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
                  <div className="heb-display" style={{ fontSize: 48, marginBottom: 12, opacity: 0.2 }}>דרשאי</div>
                  <p style={{ fontSize: 18 }}>No encounters yet</p>
                  <p style={{ fontSize: 14, marginTop: 8 }}>Create your first file to begin</p>
                  <button className="btn primary" style={{ marginTop: 20 }} onClick={() => setShowNew(true)}>
                    <span className="icon">{I.plus}</span> New File
                  </button>
                </div>
              ) : (
                <div className="file-grid">
                  {encounters.map(enc => {
                    const typeInfo = templates.find(t => t.id === enc.type);
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
                  <div className="page-eyebrow">{templates.find(t => t.id === activeFile.type)?.en || activeFile.topic || 'Encounter'}</div>
                  <h1 className="file-detail-title">{templates.find(t => t.id === activeFile.type)?.heb || ''}</h1>
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
                  { key: 'sources', en: 'Sources', heb: 'מקורות', count: activeFile.sources?.length },
                  { key: 'insights', en: 'Insights', heb: 'ניצוצות' },
                  { key: 'draft', en: 'Draft', heb: 'טיוטה' },
                  { key: 'final', en: 'Final', heb: 'סופי' },
                ].map((tab: { key: string; en: string; heb: string; count?: number }) => (
                  <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key as FileTab)}>
                    <span className="en">{tab.en}</span>
                    {tab.count ? <span className="count">{tab.count}</span> : null}
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
                <div className={zenMode ? '' : 'composer'} style={zenMode ? { position: 'fixed', inset: 0, zIndex: 45, background: 'var(--bg-page)', display: 'grid', gridTemplateColumns: asideCollapsed ? '1fr' : '1fr 320px', overflow: 'hidden' } : undefined}>
                  <div style={zenMode ? { overflow: 'auto', padding: '40px 48px 80px' } : undefined}>
                    {/* Toolbar */}
                    <div className="toolbar">
                      <button className="icon-btn" title="Bold"><span style={{ fontWeight: 700, fontFamily: 'serif', fontSize: 14 }}>B</span></button>
                      <button className="icon-btn" title="Italic"><span style={{ fontStyle: 'italic', fontFamily: 'serif', fontSize: 14 }}>I</span></button>
                      <button className="icon-btn" title="Block Quote"><span style={{ fontSize: 14 }}>&ldquo;</span></button>
                      <div className="divider-v" />
                      <button className="icon-btn" title="Hebrew text"><span className="heb" style={{ fontSize: 13 }}>עב</span></button>
                      <button className="icon-btn" title="Insert source" onClick={() => setShowSources(true)}><span className="icon" style={{ width: 16, height: 16 }}>{I.book}</span></button>
                      <div style={{ flex: 1 }} />
                      <button className={`icon-btn ${zenMode ? 'active' : ''}`} title={zenMode ? 'Exit zen mode' : 'Zen mode — full screen'}
                        onClick={() => setZenMode(!zenMode)}>
                        <span style={{ fontSize: 14 }}>{zenMode ? '✕' : '◻'}</span>
                      </button>
                      <button className="btn ghost small" onClick={() => handleCopy(userDraft || streamedContent || activeFile.generatedContent?.[activeFile.generatedContent.length - 1]?.content || '')}>
                        <span className="icon" style={{ width: 14, height: 14 }}>{I.copy}</span> Copy
                      </button>
                    </div>

                    {/* User writing area — always available */}
                    <div className="composer-paper grain" style={{ position: 'relative', marginBottom: 16 }}>
                      <h2 className="composer-h heb-display">{templates.find(t => t.id === activeFile.type)?.heb || 'טיוטה'}</h2>
                      <div className="composer-h-en">{activeFile.congregantName}</div>
                      <textarea className="composer-body" value={userDraft}
                        onChange={e => setUserDraft(e.target.value)}
                        placeholder="Begin writing your thoughts here... Your words will be woven into the AI-generated document based on the preserve level you set."
                        style={{ width: '100%', border: 'none', background: 'transparent', resize: 'none', outline: 'none', minHeight: 300, fontFamily: "'Cormorant Garamond', serif", fontSize: 19, lineHeight: 1.7, color: 'var(--ink)' }} />
                    </div>

                    {/* Preserve level */}
                    {userDraft.trim() && (
                      <div className="card" style={{ padding: '12px 18px', marginBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', flexShrink: 0 }}>Preserve</span>
                          <input type="range" min={1} max={5} value={preserveLevel} onChange={e => setPreserveLevel(Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--accent)' }} />
                          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-2)', width: 80, textAlign: 'right' }}>
                            {['', 'Loose', 'Ideas', 'Balanced', 'Close', 'Exact'][preserveLevel]}
                          </span>
                        </div>
                        <div className="settings-help" style={{ marginTop: 4 }}>
                          {preserveLevel <= 2 ? 'AI will use your draft as inspiration and rewrite freely' :
                           preserveLevel === 3 ? 'AI will keep your structure and voice, improving and expanding' :
                           'AI will preserve your writing closely, only refining and completing'}
                        </div>
                      </div>
                    )}

                    {/* Generated content */}
                    {streamedContent && (
                      <div className="composer-paper grain" style={{ position: 'relative' }}>
                        <div className="mono" style={{ color: 'var(--gold)', marginBottom: 12, textAlign: 'center' }}>AI Generated</div>
                        <div className="composer-body" style={{ minHeight: 0 }}>
                          {streamedContent.split('\n\n').map((para, i) => (
                            <p key={i} className={i === 0 ? 'first-cap' : ''} style={{ whiteSpace: 'pre-wrap' }}>{para}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {!streamedContent && activeFile.generatedContent?.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {activeFile.generatedContent.map((g, i) => (
                          <div key={i} className="composer-paper grain" style={{ position: 'relative' }}>
                            <div className="mono" style={{ color: 'var(--gold)', marginBottom: 16, textAlign: 'center' }}>
                              {g.type.replace('_', ' ')} — {new Date(g.generatedAt).toLocaleDateString()}
                            </div>
                            <div className="composer-body" style={{ minHeight: 0 }}>
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
                    ) : null}
                  </div>

                  {/* Aside panel — collapsible */}
                  {(!zenMode || !asideCollapsed) && (
                    <div className="aside" style={zenMode ? { overflow: 'auto', padding: '40px 20px 80px 0', borderLeft: '1px solid var(--rule-soft)' } : undefined}>
                      {zenMode && (
                        <button className="btn ghost small" style={{ marginBottom: 8 }} onClick={() => setAsideCollapsed(true)}>
                          Collapse panel
                        </button>
                      )}

                      {/* AI Mode */}
                      <div className="aside-card">
                        <div className="aside-h">AI Assist</div>
                        <div className="ai-modes">
                          {[
                            { key: 'heavy', label: 'Heavy' },
                            { key: 'collab', label: 'Collab' },
                            { key: 'light', label: 'Light' },
                          ].map(m => (
                            <button key={m.key} className={`ai-mode ${aiMode === m.key ? 'active' : ''}`}
                              onClick={() => setAiMode(m.key as typeof aiMode)}>
                              {m.label}
                            </button>
                          ))}
                        </div>
                        <div className="ai-status">
                          {aiMode === 'heavy' ? 'AI drafts fully, you refine and approve' :
                           aiMode === 'collab' ? 'You write together — AI suggests, you decide' :
                           'You write, AI assists only when asked'}
                        </div>
                      </div>

                      {/* Key points from encounter */}
                      {activeFile.transcript && (
                        <details className="aside-card" open={!zenMode}>
                          <summary className="aside-h" style={{ cursor: 'pointer', marginBottom: 0 }}>Key Points</summary>
                          <div style={{ marginTop: 10 }}>
                            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
                              {activeFile.transcript.substring(0, 300)}{activeFile.transcript.length > 300 ? '...' : ''}
                            </p>
                          </div>
                        </details>
                      )}

                      {/* Sources */}
                      {(activeFile.sources?.length || 0) > 0 && (
                        <details className="aside-card">
                          <summary className="aside-h" style={{ cursor: 'pointer', marginBottom: 0 }}>
                            Sources <span className="count">{activeFile.sources!.length}</span>
                          </summary>
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {activeFile.sources!.map((s, i) => (
                              <div key={i} className="suggest">
                                <div>
                                  <div className="mono" style={{ fontSize: 9, color: 'var(--gold)' }}>{s.ref}</div>
                                  <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{(s.en || s.he).substring(0, 60)}...</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {/* Sparks */}
                      {sparks.length > 0 && (
                        <details className="aside-card">
                          <summary className="aside-h" style={{ cursor: 'pointer', marginBottom: 0 }}>
                            Sparks <span className="count">{sparks.length}</span>
                          </summary>
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {sparks.slice(0, 5).map(s => (
                              <div key={s.id} className="suggest">
                                <div>
                                  <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>{s.tag}</div>
                                  <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{s.body.substring(0, 60)}...</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {/* Notes */}
                      {activeFile.notes && (
                        <details className="aside-card">
                          <summary className="aside-h" style={{ cursor: 'pointer', marginBottom: 0 }}>Notes</summary>
                          <div style={{ marginTop: 10 }}>
                            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                              {activeFile.notes.substring(0, 200)}{activeFile.notes.length > 200 ? '...' : ''}
                            </p>
                          </div>
                        </details>
                      )}

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
                          disabled={generating || (!activeFile.transcript?.trim() && !userDraft.trim())}>
                          {generating ? 'Generating...' : `Generate ${DRAFT_TYPES.find(d => d.key === draftType)?.label}`}
                        </button>
                        {!activeFile.transcript?.trim() && !userDraft.trim() && (
                          <p style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic', marginTop: 8 }}>
                            Add a transcript or write your thoughts above.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {zenMode && asideCollapsed && (
                    <button className="btn ghost small" style={{ position: 'fixed', top: 12, right: 12, zIndex: 46 }}
                      onClick={() => setAsideCollapsed(false)}>
                      Show panel
                    </button>
                  )}
                </div>
              )}

              {/* ── Documents Tab ── */}
              {activeTab === 'documents' && (
                <div>
                  <div className="section-head">
                    <div><h2 className="section-title">מסמכים</h2><div className="section-title-en">Documents</div></div>
                    <label className="btn small" style={{ cursor: 'pointer' }}>
                      <span className="icon">{I.plus}</span> Upload
                      <input type="file" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.heic"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files) return;
                          for (const file of Array.from(files)) {
                            const form = new FormData();
                            form.append('file', file);
                            form.append('encounterId', openFileId || '');
                            try {
                              const res = await fetch('/api/upload-document', { method: 'POST', body: form });
                              if (res.ok) {
                                const data = await res.json();
                                // Store doc reference in encounter
                                await fetch(`/api/rav/encounters/${openFileId}`, {
                                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ appendTranscript: `[Document: ${file.name} (${(file.size / 1024).toFixed(1)}KB) — ${data.url}]` }),
                                });
                                fetchEncounters();
                              }
                            } catch {}
                          }
                          e.target.value = '';
                        }} />
                    </label>
                  </div>
                  <label className="dropzone" style={{ cursor: 'pointer', display: 'block' }}>
                    <span className="icon" style={{ width: 32, height: 32, display: 'block', margin: '0 auto 8px', color: 'var(--ink-3)' }}>{I.doc}</span>
                    <p style={{ fontSize: 15 }}>Drop files here or click to upload</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>PDFs, photos, notes, condolence letters</p>
                    <input type="file" multiple accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.heic"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const files = e.target.files;
                        if (!files) return;
                        for (const file of Array.from(files)) {
                          const form = new FormData();
                          form.append('file', file);
                          form.append('encounterId', openFileId || '');
                          try {
                            await fetch('/api/upload-document', { method: 'POST', body: form });
                          } catch {}
                        }
                        e.target.value = '';
                      }} />
                  </label>
                </div>
              )}

              {/* ── Sources Tab ── */}
              {activeTab === 'sources' && (
                <div>
                  <div className="section-head">
                    <div>
                      <h2 className="section-title">מקורות</h2>
                      <div className="section-title-en">Sources</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn small" onClick={() => setShowSources(true)}>
                        <span className="icon">{I.search}</span> Find Source
                      </button>
                      <button className="btn small" onClick={() => { setView('library'); setOpenFileId(null); }}>
                        <span className="icon">{I.book}</span> Library
                      </button>
                    </div>
                  </div>

                  {(activeFile.sources?.length || 0) > 0 ? (
                    <div className="source-list">
                      {activeFile.sources!.map((s, i) => (
                        <div key={i} className="source-card">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="source-cite">{s.ref}</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button className="btn ghost small" title="Copy" onClick={() => handleCopy(`${s.ref}\n${s.he}\n${s.en}`)}>
                                <span className="icon" style={{ width: 12, height: 12 }}>{I.copy}</span>
                              </button>
                              <button className="btn ghost small" title="Remove" onClick={async () => {
                                await fetch(`/api/rav/encounters/${openFileId}`, {
                                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ removeSourceRef: s.ref }),
                                });
                                fetchEncounters();
                              }}>
                                <span className="icon" style={{ width: 12, height: 12 }}>{I.trash}</span>
                              </button>
                            </div>
                          </div>
                          {s.he && <div className="source-heb">{s.he}</div>}
                          {s.en && <div className="source-en">{s.en}</div>}
                          {s.note && <div className="source-note">{s.note}</div>}
                        </div>
                      ))}
                    </div>
                  ) : (
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
                  )}
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
                          <span className="icon">{I.print}</span> Print / PDF
                        </button>
                        <button className="btn" onClick={() => {
                          const content = activeFile.generatedContent![activeFile.generatedContent!.length - 1].content;
                          const typeInfo = templates.find(t => t.id === activeFile.type);
                          const html = `<html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.7;font-size:16px;color:#1a1a1a}h1{text-align:center;font-size:28px}p{margin-bottom:1em}</style></head><body><h1>${typeInfo?.en || 'Document'}: ${activeFile.congregantName}</h1>${content.split('\n\n').map(p => '<p>' + p + '</p>').join('')}</body></html>`;
                          const blob = new Blob([html], { type: 'application/msword' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url;
                          a.download = `${activeFile.congregantName} - ${typeInfo?.en || 'Document'}.doc`;
                          a.click(); URL.revokeObjectURL(url);
                        }}>
                          <span className="icon">{I.doc}</span> Word
                        </button>
                        <button className="btn" onClick={() => {
                          const content = activeFile.generatedContent![activeFile.generatedContent!.length - 1].content;
                          if (navigator.share) {
                            navigator.share({ title: activeFile.congregantName, text: content });
                          } else {
                            handleCopy(content);
                          }
                        }}>
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
              </div>

              {/* Capture area */}
              <div className="card" style={{ padding: 22, marginBottom: 20 }}>
                <textarea className="input serif" rows={3} value={newSpark} onChange={e => setNewSpark(e.target.value)}
                  placeholder="A fleeting thought, a connection, an image that spoke to you..." style={{ marginBottom: 12 }} />

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Text capture */}
                  <button className="btn primary" onClick={() => {
                    if (newSpark.trim()) {
                      setSparks(prev => [{ id: crypto.randomUUID(), body: newSpark, tag: 'Thought', when: new Date().toLocaleDateString() }, ...prev]);
                      setNewSpark('');
                    }
                  }} disabled={!newSpark.trim()}>
                    <span className="icon">{I.plus}</span> Capture
                  </button>

                  {/* Voice note (dictation) */}
                  <button className={`btn ${sparkRecording ? 'primary' : ''}`}
                    disabled={sparkTranscribing}
                    onClick={async () => {
                      if (sparkRecording) {
                        // Stop
                        const recorder = sparkRecorderRef.current;
                        if (recorder) {
                          recorder.stop();
                          recorder.stream.getTracks().forEach(t => t.stop());
                          sparkRecorderRef.current = null;
                          setSparkRecording(false);
                          setSparkTranscribing(true);
                          const blob = new Blob(sparkChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
                          sparkChunksRef.current = [];
                          try {
                            const fd = new FormData();
                            fd.append('audio', blob, 'spark-dictation.webm');
                            fd.append('mode', 'dictation');
                            const res = await fetch('/api/transcribe-elevenlabs', { method: 'POST', body: fd });
                            if (res.ok) {
                              const data = await res.json();
                              if (data.text) {
                                setSparks(prev => [{ id: crypto.randomUUID(), body: data.text, tag: 'Voice Note', when: new Date().toLocaleDateString() }, ...prev]);
                              }
                            }
                          } catch {} finally { setSparkTranscribing(false); }
                        }
                      } else {
                        // Start
                        try {
                          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                          const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/mp4';
                          const recorder = new MediaRecorder(stream, { mimeType });
                          sparkChunksRef.current = [];
                          recorder.ondataavailable = (e) => { if (e.data.size > 0) sparkChunksRef.current.push(e.data); };
                          recorder.start(1000);
                          sparkRecorderRef.current = recorder;
                          setSparkRecording(true);
                        } catch { setNewSpark(prev => prev + '\n[Microphone access denied]'); }
                      }
                    }}>
                    <span className="icon">{sparkRecording ? I.stop : I.mic}</span>
                    {sparkTranscribing ? 'Transcribing...' : sparkRecording ? 'Stop & Save' : 'Voice Note'}
                  </button>

                  {/* URL */}
                  <button className="btn" onClick={() => {
                    const url = prompt('Paste a URL (article, teaching, video):');
                    if (url?.trim()) {
                      setSparks(prev => [{ id: crypto.randomUUID(), body: url.trim(), tag: 'Link', when: new Date().toLocaleDateString(), url: url.trim() }, ...prev]);
                    }
                  }}>
                    <span className="icon" style={{ width: 16, height: 16 }}>{I.search}</span> URL
                  </button>

                  {/* File upload (PDF, image, screenshot) */}
                  <label className="btn" style={{ cursor: 'pointer' }}>
                    <span className="icon">{I.doc}</span> Upload
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.txt" style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const form = new FormData();
                        form.append('file', file);
                        form.append('encounterId', 'sparks');
                        try {
                          const res = await fetch('/api/upload-document', { method: 'POST', body: form });
                          if (res.ok) {
                            const data = await res.json();
                            setSparks(prev => [{
                              id: crypto.randomUUID(),
                              body: `${file.name} (${(file.size / 1024).toFixed(1)}KB)`,
                              tag: file.type.startsWith('image/') ? 'Screenshot' : 'Document',
                              when: new Date().toLocaleDateString(),
                              url: data.url,
                            }, ...prev]);
                          }
                        } catch {}
                        e.target.value = '';
                      }} />
                  </label>

                  {/* Screenshot (clipboard paste) */}
                  <button className="btn" onClick={async () => {
                    try {
                      const items = await navigator.clipboard.read();
                      for (const item of items) {
                        const imageType = item.types.find(t => t.startsWith('image/'));
                        if (imageType) {
                          const blob = await item.getType(imageType);
                          const form = new FormData();
                          form.append('file', blob, `screenshot-${Date.now()}.png`);
                          form.append('encounterId', 'sparks');
                          const res = await fetch('/api/upload-document', { method: 'POST', body: form });
                          if (res.ok) {
                            const data = await res.json();
                            setSparks(prev => [{
                              id: crypto.randomUUID(),
                              body: 'Screenshot captured',
                              tag: 'Screenshot',
                              when: new Date().toLocaleDateString(),
                              url: data.url,
                            }, ...prev]);
                          }
                          return;
                        }
                      }
                      const text = await navigator.clipboard.readText();
                      if (text) setNewSpark(prev => prev ? prev + '\n' + text : text);
                    } catch { alert('Clipboard access denied. Try pasting with ⌘V instead.'); }
                  }}>
                    <span className="icon">{I.copy}</span> Paste
                  </button>
                </div>
              </div>

              {/* Selection actions */}
              {sparkSelected.size > 0 && (
                <div className="card" style={{ padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}>
                  <span className="mono" style={{ color: 'var(--accent)' }}>{sparkSelected.size} selected</span>
                  <div style={{ flex: 1 }} />
                  {sparkSelected.size >= 2 && (
                    <button className="btn small" onClick={mergeSparks}>
                      <span className="icon" style={{ width: 14, height: 14 }}>{I.plus}</span> Merge Together
                    </button>
                  )}
                  {encounters.length > 0 && (
                    <select className="input" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }}
                      onChange={e => { if (e.target.value) { mergeSparkToFile(e.target.value); e.target.value = ''; } }}
                      defaultValue="">
                      <option value="" disabled>Merge to file...</option>
                      {encounters.map(enc => (
                        <option key={enc.id} value={enc.id}>{enc.congregantName}</option>
                      ))}
                    </select>
                  )}
                  <button className="btn small" style={{ color: 'var(--accent)' }}
                    onClick={() => { setSparks(prev => prev.filter(s => !sparkSelected.has(s.id))); setSparkSelected(new Set()); }}>
                    <span className="icon" style={{ width: 14, height: 14 }}>{I.trash}</span> Delete
                  </button>
                  <button className="btn ghost small" onClick={() => setSparkSelected(new Set())}>Clear</button>
                </div>
              )}

              {/* Category filter */}
              {sparks.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto' }}>
                  {['all', ...SPARK_CATEGORIES].map(cat => (
                    <button key={cat} className={`tab ${sparkFilter === cat ? 'active' : ''}`}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                      onClick={() => setSparkFilter(cat)}>
                      {cat === 'all' ? 'All' : cat}
                    </button>
                  ))}
                </div>
              )}

              {/* Sparks list */}
              {sparks.length === 0 ? (
                <div className="empty-state">
                  <p style={{ fontSize: 18 }}>Your sparks inbox is empty</p>
                  <p style={{ fontSize: 14, marginTop: 8 }}>Capture ideas, fragments, and connections before they fade</p>
                  <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 16 }}>
                    Type a thought · Record a voice note · Save a URL · Upload a file · Paste a screenshot
                  </p>
                </div>
              ) : (
                <div className="insight-grid">
                  {sparks
                    .filter(s => sparkFilter === 'all' || (s.category || 'Uncategorized') === sparkFilter)
                    .map(s => (
                    <div key={s.id} className={`insight-card card ${sparkSelected.has(s.id) ? 'pin' : ''}`}
                      style={{ cursor: 'default', border: sparkSelected.has(s.id) ? '2px solid var(--accent)' : undefined }}>

                      {/* Header: checkbox + tag + actions */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <input type="checkbox" checked={sparkSelected.has(s.id)}
                          onChange={() => toggleSparkSelect(s.id)}
                          style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
                        <div className="insight-tag" style={{ flex: 1 }}>{s.tag}</div>
                        <div style={{ display: 'flex', gap: 2 }}>
                          <button className="btn ghost small" style={{ minHeight: 24, minWidth: 24, padding: 2 }}
                            onClick={() => { setEditingSpark(s.id); setEditSparkText(s.body); }}
                            title="Edit">
                            <span className="icon" style={{ width: 12, height: 12, fontSize: 11 }}>✎</span>
                          </button>
                          <button className="btn ghost small" style={{ minHeight: 24, minWidth: 24, padding: 2 }}
                            onClick={async () => {
                              setSparkSearching(s.id);
                              try {
                                const keywords = s.body.split(/\s+/).filter(w => w.length > 3).slice(0, 3).join(' ');
                                const res = await fetch(`/api/sources?q=${encodeURIComponent(keywords)}`);
                                if (res.ok) {
                                  const data = await res.json();
                                  setSourceResults(data.results || []);
                                  setSourceQuery(keywords);
                                  setShowSources(true);
                                }
                              } catch {} finally { setSparkSearching(null); }
                            }}
                            title="Find related sources">
                            <span className="icon" style={{ width: 12, height: 12 }}>{I.search}</span>
                          </button>
                          <button className="btn ghost small" style={{ minHeight: 24, minWidth: 24, padding: 2 }}
                            onClick={() => setSparks(prev => prev.filter(x => x.id !== s.id))}
                            title="Delete">
                            <span className="icon" style={{ width: 12, height: 12 }}>{I.trash}</span>
                          </button>
                        </div>
                      </div>

                      {/* Body — editable or display */}
                      {editingSpark === s.id ? (
                        <div>
                          <textarea className="input serif" rows={3} value={editSparkText}
                            onChange={e => setEditSparkText(e.target.value)} autoFocus
                            style={{ marginBottom: 8, fontSize: 15 }} />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn small primary" onClick={() => {
                              setSparks(prev => prev.map(x => x.id === s.id ? { ...x, body: editSparkText } : x));
                              setEditingSpark(null);
                            }}>Save</button>
                            <button className="btn ghost small" onClick={() => setEditingSpark(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="insight-body" onClick={() => { if (s.url) window.open(s.url, '_blank'); }}
                          style={{ cursor: s.url ? 'pointer' : 'default' }}>
                          {s.body}
                        </div>
                      )}

                      {s.url && <div className="mono" style={{ fontSize: 9, color: 'var(--accent)', wordBreak: 'break-all' }}>{s.url.substring(0, 60)}{s.url.length > 60 ? '...' : ''}</div>}

                      {/* Category selector + footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                        <select className="mono" value={s.category || 'Uncategorized'}
                          onChange={e => setSparks(prev => prev.map(x => x.id === s.id ? { ...x, category: e.target.value } : x))}
                          style={{ fontSize: 9, background: 'var(--bg-sunken)', border: '1px solid var(--rule-soft)', borderRadius: 3, padding: '2px 4px', color: 'var(--ink-3)', cursor: 'pointer' }}>
                          {SPARK_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                        <div className="insight-foot">{s.when}</div>
                      </div>
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
                <button className="btn primary" onClick={() => {
                  setNewTempl({ id: crypto.randomUUID(), heb: '', en: '', sections: '', desc: '', prompt: '' });
                  setShowNewTemplate(true);
                }}>
                  <span className="icon">{I.plus}</span> New Template
                </button>
              </div>

              {/* Template editor */}
              {(editingTemplate || showNewTemplate) && (
                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                      {showNewTemplate ? 'New Template' : 'Edit Template'}
                    </h3>
                    <button className="btn ghost small" onClick={() => { setEditingTemplate(null); setShowNewTemplate(false); }}>
                      <span className="icon" style={{ width: 14, height: 14 }}>{I.x}</span>
                    </button>
                  </div>

                  {(() => {
                    const t = showNewTemplate ? newTempl : editTempl;
                    if (!t) return null;
                    const setT = showNewTemplate
                      ? (fn: (prev: Template) => Template) => setNewTempl(fn)
                      : (fn: (prev: Template) => Template) => setEditTempl(prev => prev ? fn(prev) : prev);
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Basic info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div>
                            <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Hebrew Name</div>
                            <input className="input serif" value={t.heb} onChange={e => setT(p => ({ ...p, heb: e.target.value }))}
                              placeholder="e.g., הספד" style={{ direction: 'rtl' }} />
                          </div>
                          <div>
                            <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>English Name</div>
                            <input className="input serif" value={t.en} onChange={e => setT(p => ({ ...p, en: e.target.value }))}
                              placeholder="e.g., Eulogy (Hesped)" />
                          </div>
                        </div>
                        <div>
                          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Description</div>
                          <input className="input serif" value={t.desc} onChange={e => setT(p => ({ ...p, desc: e.target.value }))}
                            placeholder="A brief description of this template" />
                        </div>
                        <div>
                          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Sections</div>
                          <input className="input" value={t.sections} onChange={e => setT(p => ({ ...p, sections: e.target.value }))}
                            placeholder="Opening, Body, Torah, Closing (comma-separated)" />
                          <div className="settings-help">Comma-separated section names that define the document structure</div>
                        </div>

                        <hr className="divider" style={{ margin: '4px 0' }} />

                        {/* Full template body */}
                        <div>
                          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Full Template Body</div>
                          <div className="settings-help" style={{ marginBottom: 8 }}>
                            Write the complete document skeleton. The AI will fill in content based on the encounter.
                            Use section headers and placeholder text to guide the output.
                          </div>
                          <textarea className="input serif" rows={8} value={t.fullBody || ''}
                            onChange={e => setT(p => ({ ...p, fullBody: e.target.value }))}
                            placeholder={"[Opening]\nWe gather today to honor the memory of {{subject}}...\n\n[Life Story]\nThose who knew {{subject}} will remember...\n\n[Torah]\nIn Kohelet we read...\n\n[Closing]\nMay the memory of {{subject}} be a blessing..."} />
                        </div>

                        <hr className="divider" style={{ margin: '4px 0' }} />

                        {/* AI prompt */}
                        <div>
                          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>AI Generation Prompt</div>
                          <div className="settings-help" style={{ marginBottom: 8 }}>
                            Instructions for the AI when generating content using this template.
                          </div>
                          <textarea className="input" rows={5} value={t.prompt}
                            onChange={e => setT(p => ({ ...p, prompt: e.target.value }))}
                            placeholder="Based on the encounter transcript with {{subject}}, create a document that..."
                            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.6 }} />
                          <div className="settings-help" style={{ marginTop: 6 }}>
                            Variables:{' '}
                            {['{{transcript}}', '{{subject}}', '{{notes}}', '{{documents}}', '{{sparks}}', '{{sources}}', '{{template_body}}'].map(v => (
                              <code key={v} className="mono" style={{ fontSize: 10, padding: '1px 4px', background: 'var(--bg-sunken)', borderRadius: 3, marginRight: 4 }}>{v}</code>
                            ))}
                          </div>
                        </div>

                        <hr className="divider" style={{ margin: '4px 0' }} />

                        {/* Context variables to include */}
                        <div>
                          <div className="settings-label" style={{ fontSize: 13, marginBottom: 8 }}>Include in Generation</div>
                          <div className="settings-help" style={{ marginBottom: 10 }}>
                            Select which context the AI receives when generating with this template.
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {[
                              { key: 'transcript', label: 'Encounter transcript', desc: 'The recorded conversation' },
                              { key: 'notes', label: 'Private notes', desc: 'Your personal annotations' },
                              { key: 'documents', label: 'Uploaded documents', desc: 'PDFs, photos, letters attached to the file' },
                              { key: 'sparks', label: 'Related sparks', desc: 'Insights and ideas from your sparks inbox' },
                              { key: 'sources', label: 'Attached sources', desc: 'Torah/Talmud sources linked to the file' },
                            ].map(v => {
                              const active = (t.variables || ['transcript', 'notes']).includes(v.key);
                              return (
                                <button key={v.key}
                                  className={`btn small ${active ? 'primary' : ''}`}
                                  style={{ fontSize: 12 }}
                                  onClick={() => setT(p => {
                                    const vars = p.variables || ['transcript', 'notes'];
                                    return { ...p, variables: active ? vars.filter(x => x !== v.key) : [...vars, v.key] };
                                  })}>
                                  {v.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <hr className="divider" style={{ margin: '4px 0' }} />

                        {/* Style documents */}
                        <div>
                          <div className="settings-label" style={{ fontSize: 13, marginBottom: 4 }}>Style Examples</div>
                          <div className="settings-help" style={{ marginBottom: 10 }}>
                            Upload documents that represent your writing style. The AI will match this tone, structure, and voice.
                          </div>

                          {(t.styleDocuments || []).map((doc, i) => (
                            <div key={i} className="list-row" style={{ marginBottom: 6 }}>
                              <div className="list-row-icon"><span className="icon">{I.doc}</span></div>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>{doc.name}</div>
                                {doc.excerpt && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{doc.excerpt.substring(0, 80)}...</div>}
                              </div>
                              <button className="btn ghost small" onClick={() => setT(p => ({
                                ...p, styleDocuments: (p.styleDocuments || []).filter((_, j) => j !== i)
                              }))}>
                                <span className="icon" style={{ width: 14, height: 14 }}>{I.trash}</span>
                              </button>
                            </div>
                          ))}

                          <div style={{ display: 'flex', gap: 8 }}>
                            <label className="btn small" style={{ cursor: 'pointer' }}>
                              <span className="icon">{I.doc}</span> Upload Document
                              <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
                                onChange={async e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const form = new FormData();
                                  form.append('file', file);
                                  form.append('encounterId', 'templates');
                                  try {
                                    const res = await fetch('/api/upload-document', { method: 'POST', body: form });
                                    if (res.ok) {
                                      const data = await res.json();
                                      // Read text excerpt if it's a text file
                                      let excerpt = '';
                                      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
                                        excerpt = await file.text().then(t => t.substring(0, 200));
                                      }
                                      setT(p => ({
                                        ...p,
                                        styleDocuments: [...(p.styleDocuments || []), { name: file.name, url: data.url, excerpt }]
                                      }));
                                    }
                                  } catch {}
                                  e.target.value = '';
                                }} />
                            </label>
                            <button className="btn small" onClick={() => {
                              const text = prompt('Paste a text excerpt that represents your style:');
                              if (text?.trim()) {
                                setT(p => ({
                                  ...p,
                                  styleDocuments: [...(p.styleDocuments || []), { name: 'Pasted excerpt', url: '', excerpt: text.trim() }]
                                }));
                              }
                            }}>
                              <span className="icon">{I.copy}</span> Paste Text
                            </button>
                          </div>
                        </div>

                        <hr className="divider" style={{ margin: '4px 0' }} />

                        {/* Save */}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn primary" onClick={() => {
                            if (showNewTemplate) {
                              if (!newTempl.en.trim()) return;
                              setTemplates(prev => [...prev, { ...newTempl, id: newTempl.id || crypto.randomUUID() }]);
                              setShowNewTemplate(false);
                            } else if (editTempl) {
                              setTemplates(prev => prev.map(x => x.id === editTempl.id ? editTempl : x));
                              setEditingTemplate(null);
                            }
                          }}>
                            {showNewTemplate ? 'Create Template' : 'Save Changes'}
                          </button>
                          <button className="btn ghost" onClick={() => { setEditingTemplate(null); setShowNewTemplate(false); }}>Cancel</button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Template grid */}
              <div className="template-grid">
                {templates.map(t => (
                  <div key={t.id} className="card template-card" onClick={() => {
                    setEditTempl({ ...t });
                    setEditingTemplate(t.id);
                    setShowNewTemplate(false);
                  }} style={{ cursor: 'pointer' }}>
                    <div className="template-name">{t.heb}</div>
                    <div className="template-en">{t.en}</div>
                    <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.4 }}>{t.desc}</p>
                    <div className="template-sections">{t.sections}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button className="btn ghost small" onClick={e => {
                        e.stopPropagation();
                        setEditTempl({ ...t });
                        setEditingTemplate(t.id);
                        setShowNewTemplate(false);
                      }}>Edit</button>
                      {!t.builtIn && (
                        <button className="btn ghost small" style={{ color: 'var(--accent)' }}
                          onClick={e => { e.stopPropagation(); setTemplates(prev => prev.filter(x => x.id !== t.id)); }}>
                          Delete
                        </button>
                      )}
                    </div>
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

              {/* Search */}
              <form className="search-row" style={{ marginBottom: 20 }} onSubmit={e => { e.preventDefault(); searchLibrary(libQuery); }}>
                <input className="search-input" value={libQuery} onChange={e => setLibQuery(e.target.value)}
                  placeholder="Search Sefaria — try a reference (Genesis 1:1) or topic (love, mourning, justice)..." />
                <button type="submit" className="btn primary" disabled={libSearching}>
                  <span className="icon">{I.search}</span>
                </button>
              </form>

              {/* Quick browse */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Torah', ref: 'Genesis 1' },
                  { label: 'Psalms', ref: 'Psalms 23' },
                  { label: 'Proverbs', ref: 'Proverbs 3' },
                  { label: 'Pirkei Avot', ref: 'Pirkei Avot 1' },
                  { label: 'Kohelet', ref: 'Ecclesiastes 3' },
                  { label: 'Isaiah', ref: 'Isaiah 40' },
                ].map(b => (
                  <button key={b.ref} className={`btn small ${libBrowse === b.ref ? 'primary' : ''}`}
                    onClick={() => { setLibBrowse(b.ref); setLibQuery(b.ref); searchLibrary(b.ref); }}>
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Text viewer */}
              {libText && (
                <div className="card" style={{ padding: 24, marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div className="mono" style={{ color: 'var(--gold)', marginBottom: 4 }}>{libText.ref}</div>
                      {libText.heRef && <div className="heb" style={{ fontSize: 14, color: 'var(--ink-3)' }}>{libText.heRef}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn small" onClick={() => {
                        setLibSaved(prev => [{ ref: libText.ref, he: libText.he, en: libText.en, savedAt: new Date().toISOString() }, ...prev]);
                      }}>Save</button>
                      <button className="btn ghost small" onClick={() => setLibText(null)}>
                        <span className="icon" style={{ width: 14, height: 14 }}>{I.x}</span>
                      </button>
                    </div>
                  </div>
                  {libText.he && <div className="source-heb" style={{ marginBottom: 12 }}>{libText.he}</div>}
                  {libText.en && <div className="source-en">{libText.en}</div>}
                </div>
              )}
              {libLoadingText && <div className="mono" style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }}>Loading text...</div>}

              {/* Search results */}
              {libSearching && <div className="mono" style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }}>Searching Sefaria...</div>}

              {libResults.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div className="nav-section" style={{ marginBottom: 10 }}>Search Results</div>
                  <div className="source-list">
                    {libResults.map((s, i) => (
                      <div key={i} className="source-card" onClick={() => { setLibText(s); }}>
                        <div className="source-cite">{s.ref}</div>
                        {s.he && <div className="source-heb" style={{ fontSize: 18 }}>{s.he.substring(0, 150)}{s.he.length > 150 ? '...' : ''}</div>}
                        {s.en && <div className="source-en" style={{ fontSize: 14 }}>{s.en.substring(0, 150)}{s.en.length > 150 ? '...' : ''}</div>}
                        {s.categories?.length > 0 && <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 8 }}>{s.categories.join(' / ')}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved sources */}
              {libSaved.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div className="nav-section" style={{ marginBottom: 10 }}>Saved Sources</div>
                  <div className="source-list">
                    {libSaved.map((s, i) => (
                      <div key={i} className="source-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div className="source-cite">{s.ref}</div>
                          <button className="btn ghost small" onClick={() => setLibSaved(prev => prev.filter((_, j) => j !== i))}>
                            <span className="icon" style={{ width: 12, height: 12 }}>{I.trash}</span>
                          </button>
                        </div>
                        {s.he && <div className="source-heb" style={{ fontSize: 16 }}>{s.he.substring(0, 100)}{s.he.length > 100 ? '...' : ''}</div>}
                        {s.en && <div className="source-en" style={{ fontSize: 13 }}>{s.en.substring(0, 100)}{s.en.length > 100 ? '...' : ''}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!libSearching && libResults.length === 0 && libSaved.length === 0 && !libText && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  <div className="card" style={{ padding: 22 }}>
                    <div className="mono" style={{ color: 'var(--gold)', marginBottom: 8 }}>Sefaria</div>
                    <p style={{ fontSize: 20, fontWeight: 600 }}>Jewish Texts</p>
                    <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>3,000+ years of Torah, Talmud, Midrash, Halakha, and commentaries</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, fontStyle: 'italic' }}>
                      Search by reference (Genesis 1:1), topic (mourning), or keyword (hesed)
                    </p>
                  </div>
                  <div className="card" style={{ padding: 22 }}>
                    <div className="mono" style={{ color: 'var(--gold)', marginBottom: 8 }}>Personal</div>
                    <p style={{ fontSize: 20, fontWeight: 600 }}>Saved Sources</p>
                    <p style={{ fontSize: 14, color: 'var(--ink-2)', marginTop: 6 }}>Sources you save from searches appear here for quick access</p>
                    <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8, fontStyle: 'italic' }}>
                      Save sources to build your personal reference collection
                    </p>
                  </div>
                </div>
              )}
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
                          {m.charAt(0).toUpperCase() + m.slice(1)}
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
                    onClick={() => { setRecPhase('recording'); startRecording(); }}>
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
                  <button className="btn" onClick={() => {
                    const recorder = mediaRecorderRef.current;
                    if (recorder) {
                      if (recPaused) { recorder.resume(); setRecPaused(false); }
                      else { recorder.pause(); setRecPaused(true); }
                    }
                  }}>
                    <span className="icon">{recPaused ? I.play : I.pause}</span> {recPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button className="btn primary" onClick={async () => {
                    const blob = stopRecording();
                    setRecPhase('review');
                    if (blob && blob.size > 0) {
                      // Upload audio backup to Vercel Blob
                      const uploadForm = new FormData();
                      uploadForm.append('audio', blob, `recording-${Date.now()}.webm`);
                      uploadForm.append('encounterId', openFileId || 'unlinked');
                      fetch('/api/upload-audio', { method: 'POST', body: uploadForm }).catch(() => {});
                      // Transcribe
                      await transcribeAudio(blob);
                    }
                  }}>
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
                  {transcribing && <span className="mono" style={{ color: 'var(--accent)' }}>● Transcribing...</span>}
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

            <form className="search-row" onSubmit={async (e) => {
              e.preventDefault();
              if (!sourceQuery.trim()) return;
              setSearchingSource(true);
              try {
                const catMap: Record<string, string> = { tanakh: 'Tanakh', talmud: 'Talmud', midrash: 'Midrash Rabbah', commentary: 'Commentary' };
                const cat = catMap[sourceTab] || '';
                const res = await fetch(`/api/sources?q=${encodeURIComponent(sourceQuery)}&category=${encodeURIComponent(cat)}`);
                if (res.ok) { const data = await res.json(); setSourceResults(data.results || []); }
              } catch {} finally { setSearchingSource(false); }
            }}>
              <input className="search-input" value={sourceQuery} onChange={e => setSourceQuery(e.target.value)}
                placeholder="Search Torah, Talmud, Midrash... (e.g., Genesis 1:1, love, mourning)" autoFocus />
              <button type="submit" className="btn primary" disabled={searchingSource}>
                <span className="icon">{I.search}</span>
              </button>
            </form>

            <div style={{ display: 'flex', gap: 4, marginBottom: 18, overflowX: 'auto' }}>
              {['all', 'tanakh', 'talmud', 'midrash', 'commentary', 'my library'].map(tab => (
                <button key={tab} className={`tab ${sourceTab === tab ? 'active' : ''}`}
                  style={{ padding: '8px 12px', fontSize: 13 }}
                  onClick={() => setSourceTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {searchingSource && <div className="mono" style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)' }}>Searching Sefaria...</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
              {sourceResults.length === 0 && !searchingSource && sourceQuery && (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                  No results found. Try a different search term or reference (e.g., &ldquo;Genesis 1:1&rdquo;)
                </div>
              )}
              {sourceResults.map((s, i) => (
                <div key={i} className="search-result">
                  <div>
                    <div className="source-cite">{s.ref}</div>
                    {s.heRef && <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginBottom: 4 }}>{s.heRef}</div>}
                    {s.he && <div className="source-heb" style={{ fontSize: 18, marginBottom: 4 }}>{s.he.substring(0, 200)}{s.he.length > 200 ? '...' : ''}</div>}
                    {s.en && <div className="source-en" style={{ fontSize: 14 }}>{s.en.substring(0, 200)}{s.en.length > 200 ? '...' : ''}</div>}
                    {s.categories?.length > 0 && <div className="mono" style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 6 }}>{s.categories.join(' › ')}</div>}
                  </div>
                  <button className="btn small primary" onClick={async () => {
                    if (openFileId) {
                      await fetch(`/api/rav/encounters/${openFileId}`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ addSource: { ref: s.ref, heRef: s.heRef, he: s.he, en: s.en, addedAt: new Date().toISOString() } }),
                      });
                      fetchEncounters();
                    }
                    // Also save to personal library
                    setLibSaved(prev => {
                      if (prev.some(x => x.ref === s.ref)) return prev;
                      return [{ ref: s.ref, he: s.he, en: s.en, savedAt: new Date().toISOString() }, ...prev];
                    });
                  }}>Attach</button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-sunken)', borderRadius: 6 }}>
              <p style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>
                AI will suggest sources based on themes detected in your conversation transcript
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
              {templates.map(ft => (
                <button key={ft.id}
                  className={`btn small ${newType === ft.id ? 'primary' : ''}`}
                  style={{ justifyContent: 'flex-start' }}
                  onClick={() => setNewType(ft.id)}>
                  <span className="heb" style={{ fontSize: 14 }}>{ft.heb}</span>
                  <span style={{ fontSize: 12, color: newType === ft.id ? 'inherit' : 'var(--ink-3)' }}>{ft.en}</span>
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
