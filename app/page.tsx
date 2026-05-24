'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Loader2, Trash2, Copy, Check,
  Mic, FileText, BookOpen, Heart, Scroll, Mail, ClipboardList,
  X, Pencil, LogOut, ChevronLeft,
} from 'lucide-react';

interface GeneratedItem {
  type: string;
  content: string;
  generatedAt: string;
}

interface Encounter {
  id: string;
  congregantName: string;
  date: string;
  topic?: string;
  transcript: string;
  notes: string;
  generatedContent?: GeneratedItem[];
  createdAt: string;
  updatedAt: string;
}

const OUTPUT_TYPES = [
  { key: 'sermon', label: 'Sermon', icon: BookOpen, desc: 'Full sermon drawing on encounter themes' },
  { key: 'eulogy', label: 'Eulogy', icon: Heart, desc: 'Hesped honoring the deceased' },
  { key: 'teaching', label: 'Teaching', icon: Scroll, desc: 'Torah teaching connected to themes' },
  { key: 'dvar_torah', label: 'Dvar Torah', icon: FileText, desc: 'Concise word of Torah' },
  { key: 'pastoral_letter', label: 'Pastoral Letter', icon: Mail, desc: 'Personal letter to congregant' },
  { key: 'meeting_summary', label: 'Summary', icon: ClipboardList, desc: 'Private encounter notes' },
];

export default function HomePage() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [creating, setCreating] = useState(false);

  const [selectedType, setSelectedType] = useState('sermon');
  const [instructions, setInstructions] = useState('');
  const [generating, setGenerating] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [copied, setCopied] = useState(false);

  const [notes, setNotes] = useState('');
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const notesTimeoutRef = useRef<NodeJS.Timeout>(undefined);

  const active = encounters.find(e => e.id === activeId) || null;

  const fetchEncounters = useCallback(async () => {
    try {
      const res = await fetch('/api/rav/encounters');
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setEncounters(data.encounters);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEncounters(); }, [fetchEncounters]);

  useEffect(() => {
    if (active) {
      setNotes(active.notes || '');
      setTranscriptDraft(active.transcript || '');
    }
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveField = useCallback(async (field: string, value: string) => {
    if (!activeId) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/rav/encounters/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setEncounters(prev => prev.map(e => e.id === activeId ? data.encounter : e));
      }
    } catch {} finally { setSavingNotes(false); }
  }, [activeId]);

  const handleNotesChange = (text: string) => {
    setNotes(text);
    if (notesTimeoutRef.current) clearTimeout(notesTimeoutRef.current);
    notesTimeoutRef.current = setTimeout(() => saveField('notes', text), 1000);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/rav/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ congregantName: newName.trim(), topic: newTopic.trim() || undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setEncounters(prev => [data.encounter, ...prev]);
        setActiveId(data.encounter.id);
        setNewName('');
        setNewTopic('');
        setShowNew(false);
      }
    } catch {} finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/rav/encounters/${id}`, { method: 'DELETE' });
      setEncounters(prev => prev.filter(e => e.id !== id));
      if (activeId === id) setActiveId(null);
    } catch {}
  };

  const handleGenerate = async () => {
    if (!active?.transcript?.trim()) return;
    setGenerating(true);
    setStreamedContent('');
    try {
      const res = await fetch('/api/rav/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: active.transcript,
          notes: active.notes,
          type: selectedType,
          instructions: instructions.trim() || undefined,
          congregantName: active.congregantName,
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

      const generated = { type: selectedType, content: full, generatedAt: new Date().toISOString() };
      await fetch(`/api/rav/encounters/${activeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addGenerated: generated }),
      });
      await fetchEncounters();
    } catch (e: any) {
      setStreamedContent(`Error: ${e.message}`);
    } finally { setGenerating(false); }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 sticky top-0 z-40 border-b border-white/5">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white tracking-tight">Drash AI</h1>
            <p className="text-[10px] text-slate-400">Encounter Recorder</p>
          </div>
          <button onClick={() => { setShowNew(true); setActiveId(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-white/10 hover:bg-white/20 transition-colors">
            <Plus className="w-3.5 h-3.5" /> New
          </button>
          <a href="/api/auth/logout" className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <LogOut className="w-4 h-4" />
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* New Encounter */}
        {showNew && (
          <div className="rounded-2xl p-4 space-y-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">New Encounter</h3>
              <button onClick={() => setShowNew(false)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Congregant name"
                className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                autoFocus onKeyDown={e => e.key === 'Enter' && handleCreate()} />
              <input value={newTopic} onChange={e => setNewTopic(e.target.value)} placeholder="Topic / occasion (optional)"
                className="px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <button onClick={handleCreate} disabled={creating || !newName.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        )}

        {/* Encounter List */}
        {!active && (
          <div className="space-y-2">
            {encounters.length === 0 && !showNew && (
              <div className="text-center py-16">
                <Mic className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm text-slate-400">No encounters yet</p>
                <button onClick={() => setShowNew(true)}
                  className="mt-3 px-4 py-2 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors">
                  <Plus className="w-4 h-4 inline mr-1" />Start your first encounter
                </button>
              </div>
            )}
            {encounters.map(enc => (
              <button key={enc.id} onClick={() => setActiveId(enc.id)}
                className="w-full text-left rounded-xl p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{enc.congregantName}</span>
                    {enc.topic && <span className="text-xs text-slate-400 ml-2">· {enc.topic}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 tabular-nums">{enc.date}</span>
                    <button onClick={e => { e.stopPropagation(); handleDelete(enc.id); }}
                      className="p-1 rounded-md text-red-400 opacity-30 hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {enc.transcript && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{enc.transcript.substring(0, 150)}...</p>}
                {(enc.generatedContent?.length || 0) > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {enc.generatedContent!.map((g, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                        {g.type.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Active Encounter */}
        {active && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { setActiveId(null); setStreamedContent(''); }} className="p-2 rounded-lg text-slate-400 hover:text-slate-600">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex-1">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{active.congregantName}</h2>
                <p className="text-[10px] text-slate-400">{active.date}{active.topic ? ` · ${active.topic}` : ''}</p>
              </div>
            </div>

            {/* Transcript */}
            <div className="rounded-2xl p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-amber-600" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transcript</h3>
                </div>
                <button onClick={() => saveField('transcript', transcriptDraft)}
                  className="text-[10px] px-2 py-1 rounded text-amber-600 font-medium hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">
                  Save
                </button>
              </div>
              <textarea value={transcriptDraft} onChange={e => setTranscriptDraft(e.target.value)}
                placeholder="Paste or type the encounter transcript here... (voice recording coming soon)"
                rows={6}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs resize-y text-slate-900 dark:text-white placeholder:text-slate-400" />
            </div>

            {/* Notes */}
            <div className="rounded-2xl p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Pencil className="w-3.5 h-3.5 text-amber-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Private Notes</h3>
              </div>
              <textarea value={notes} onChange={e => handleNotesChange(e.target.value)}
                placeholder="Your private notes, themes to explore, relevant parsha connections..."
                rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs resize-y text-slate-900 dark:text-white placeholder:text-slate-400" />
            </div>

            {/* Generate */}
            <div className="rounded-2xl p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Generate</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
                {OUTPUT_TYPES.map(t => (
                  <button key={t.key} onClick={() => setSelectedType(t.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                      selectedType === t.key ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                    <t.icon className="w-3.5 h-3.5 flex-shrink-0" /> {t.label}
                  </button>
                ))}
              </div>
              <textarea value={instructions} onChange={e => setInstructions(e.target.value)}
                placeholder="Optional: 'Focus on themes of resilience', 'Reference this week's parsha'..."
                rows={2}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs resize-y mb-3 text-slate-900 dark:text-white placeholder:text-slate-400" />
              <button onClick={handleGenerate} disabled={generating || !active.transcript?.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 transition-colors">
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : `Generate ${OUTPUT_TYPES.find(t => t.key === selectedType)?.label}`}
              </button>

              {streamedContent && (
                <div className="mt-4 rounded-lg p-4 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                      {OUTPUT_TYPES.find(t => t.key === selectedType)?.label}
                    </span>
                    <button onClick={() => handleCopy(streamedContent)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-amber-600">
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="text-xs whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-200">{streamedContent}</div>
                </div>
              )}
            </div>

            {/* Previous generations */}
            {(active.generatedContent?.length || 0) > 0 && !streamedContent && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Previous Generations</h3>
                {active.generatedContent!.map((g, i) => (
                  <details key={i} className="rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <summary className="px-4 py-2.5 cursor-pointer flex items-center justify-between text-xs font-medium text-slate-900 dark:text-white">
                      <span className="capitalize">{g.type.replace('_', ' ')}</span>
                      <span className="text-[10px] text-slate-400">{new Date(g.generatedAt).toLocaleDateString()}</span>
                    </summary>
                    <div className="px-4 pb-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex justify-end mt-2 mb-1">
                        <button onClick={() => handleCopy(g.content)} className="text-[10px] font-medium text-amber-600">Copy</button>
                      </div>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-300">{g.content}</p>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
