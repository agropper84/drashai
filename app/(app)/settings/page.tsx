'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { I } from '@/app/_components/Icons';
import { ViewToggle } from '@/app/_components/ViewToggle';
import { ConfirmDialog } from '@/app/_components/ConfirmDialog';
import { useTheme } from '@/app/_lib/theme';
import { useWorkflows } from '@/app/_lib/workflows-store';
import { useTemplates } from '@/app/_lib/templates-store';
import { useEncounters } from '@/app/_lib/encounters-store';
import { api } from '@/app/_lib/api';
import type { Encounter, Workflow } from '@/app/_lib/types';

type SettingsTab = 'keys' | 'transcription' | 'appearance' | 'workflows' | 'privacy' | 'account';

export default function SettingsPage() {
  const { theme, setTheme, mode, setMode } = useTheme();
  const [tab, setTab] = useState<SettingsTab>('keys');
  const [userName, setUserName] = useState('');

  // API Keys
  const [claudeKey, setClaudeKey] = useState('');
  const [elevenKey, setElevenKey] = useState('');
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [hasElevenLabsKey, setHasElevenLabsKey] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [keysSaved, setKeysSaved] = useState(false);
  const [claudeKeyStatus, setClaudeKeyStatus] = useState<{ ok: boolean; error?: string } | null>(null);
  const [elevenKeyStatus, setElevenKeyStatus] = useState<{ ok: boolean; error?: string } | null>(null);

  // Transcription
  const [noiseReduction, setNoiseReduction] = useState(false);
  const [transcriptionLang, setTranscriptionLang] = useState('auto');
  const [recordingRetention, setRecordingRetention] = useState('72');

  useEffect(() => {
    api.settings.get().then((d) => {
      if (d) {
        setHasClaudeKey(!!d.hasClaudeKey);
        setHasElevenLabsKey(!!d.hasElevenLabsKey);
        if (d.name) setUserName(d.name);
      }
    }).catch(() => {});
  }, []);

  const handleSaveKeys = async () => {
    setSavingKeys(true); setClaudeKeyStatus(null); setElevenKeyStatus(null);
    try {
      const body: Record<string, string> = {};
      if (claudeKey) body.claudeApiKey = claudeKey;
      if (elevenKey) body.elevenlabsApiKey = elevenKey;
      const data = await api.settings.save(body);
      if (data.keyResults?.claude) {
        setClaudeKeyStatus(data.keyResults.claude);
        setHasClaudeKey(data.keyResults.claude.ok);
      }
      if (data.keyResults?.elevenlabs) {
        setElevenKeyStatus(data.keyResults.elevenlabs);
        setHasElevenLabsKey(data.keyResults.elevenlabs.ok);
      }
      setKeysSaved(true);
      setTimeout(() => setKeysSaved(false), 3000);
      if (data.keyResults?.claude?.ok) setClaudeKey('');
      if (data.keyResults?.elevenlabs?.ok) setElevenKey('');
    } finally { setSavingKeys(false); }
  };

  return (
    <>
      <div className="page-head">
        <div className="page-title-wrap">
          <div className="page-eyebrow">Configuration</div>
          <h1 className="page-title heb-display">הגדרות</h1>
          <div className="page-title-en">Settings</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {([
          { key: 'keys', en: 'API Keys' },
          { key: 'transcription', en: 'Transcription' },
          { key: 'appearance', en: 'Appearance' },
          { key: 'workflows', en: 'Workflows' },
          { key: 'privacy', en: 'Privacy' },
          { key: 'account', en: 'Account' },
        ] as const).map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}><span className="en">{t.en}</span></button>
        ))}
      </div>

      {/* ── API Keys ── */}
      {tab === 'keys' && (
        <div className="settings-section">
          <div className="settings-block">
            <div className="settings-row settings-row-stack">
              <div>
                <div className="settings-label">Anthropic (Claude)</div>
                <div className="settings-help">
                  Required for generating sermons, eulogies, and other content.{' '}
                  <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Get your API key →</a>
                </div>
              </div>
              <div className="key-input" style={{ marginTop: 8 }}>
                <input className="input" type="password" value={claudeKey} onChange={e => setClaudeKey(e.target.value)}
                  placeholder={hasClaudeKey ? '••••••••••••••••' : 'sk-ant-...'} />
                <span className={`key-status ${hasClaudeKey ? 'connected' : 'empty'}`}
                  style={claudeKeyStatus && !claudeKeyStatus.ok ? { background: 'rgba(220,38,38,0.08)', color: 'var(--accent)' } : undefined}>
                  {claudeKeyStatus ? (claudeKeyStatus.ok ? '● Connected' : `● ${claudeKeyStatus.error}`) : hasClaudeKey ? '● Connected' : '○ Not set'}
                </span>
              </div>
            </div>
            <div className="settings-row settings-row-stack">
              <div>
                <div className="settings-label">ElevenLabs</div>
                <div className="settings-help">
                  For voice transcription (Scribe v2 with speaker diarization).{' '}
                  <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Get your API key →</a>
                </div>
              </div>
              <div className="key-input" style={{ marginTop: 8 }}>
                <input className="input" type="password" value={elevenKey} onChange={e => setElevenKey(e.target.value)}
                  placeholder={hasElevenLabsKey ? '••••••••••••••••' : 'xi-...'} />
                <span className={`key-status ${hasElevenLabsKey ? 'connected' : 'empty'}`}
                  style={elevenKeyStatus && !elevenKeyStatus.ok ? { background: 'rgba(220,38,38,0.08)', color: 'var(--accent)' } : undefined}>
                  {elevenKeyStatus ? (elevenKeyStatus.ok ? '● Connected' : `● ${elevenKeyStatus.error}`) : hasElevenLabsKey ? '● Connected' : '○ Not set'}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <button className="btn primary" onClick={handleSaveKeys} disabled={savingKeys || (!claudeKey && !elevenKey)}>
                {keysSaved ? '✓ Saved & Tested' : savingKeys ? 'Testing...' : 'Save & Test Keys'}
              </button>
            </div>
            <div className="privacy-vow" style={{ marginTop: 14 }}>
              <div className="privacy-vow-title"><span className="icon" style={{ width: 12, height: 12 }}>{I.lock}</span> Security</div>
              <p style={{ fontSize: 14 }}>API keys are stored encrypted. They never leave the server and are only used to make API calls on your behalf.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Transcription ── */}
      {tab === 'transcription' && (
        <div className="settings-section">
          <div className="settings-block">
            <div className="settings-row">
              <div>
                <div className="settings-label">Background noise reduction</div>
                <div className="settings-help">ElevenLabs audio isolation — removes background noise before transcription.</div>
              </div>
              <div className="mode-toggle">
                <button className={noiseReduction ? 'active' : ''} onClick={() => setNoiseReduction(true)}>On</button>
                <button className={!noiseReduction ? 'active' : ''} onClick={() => setNoiseReduction(false)}>Off</button>
              </div>
            </div>
            <div className="settings-row settings-row-stack">
              <div>
                <div className="settings-label">Transcription language</div>
                <div className="settings-help">Set to Auto for automatic detection, or choose a specific language.</div>
              </div>
              <select className="input" style={{ marginTop: 8 }} value={transcriptionLang} onChange={e => setTranscriptionLang(e.target.value)}>
                <option value="auto">Auto-detect</option>
                <optgroup label="Common">
                  <option value="en">English</option>
                  <option value="he">Hebrew (עברית)</option>
                  <option value="ar">Arabic (العربية)</option>
                  <option value="fr">French (Français)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="de">German (Deutsch)</option>
                  <option value="ru">Russian (Русский)</option>
                  <option value="yi">Yiddish (ייִדיש)</option>
                </optgroup>
                <optgroup label="More">
                  <option value="pt">Portuguese</option>
                  <option value="it">Italian</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                  <option value="hi">Hindi</option>
                  <option value="fa">Persian (Farsi)</option>
                  <option value="am">Amharic</option>
                </optgroup>
              </select>
            </div>
            <div className="settings-row settings-row-stack">
              <div>
                <div className="settings-label">Recording storage duration</div>
                <div className="settings-help">How long audio recordings are kept. Transcripts are always retained.</div>
              </div>
              <select className="input" style={{ marginTop: 8 }} value={recordingRetention} onChange={e => setRecordingRetention(e.target.value)}>
                <option value="24">24 hours</option>
                <option value="72">3 days</option>
                <option value="168">1 week</option>
                <option value="720">30 days</option>
                <option value="0">Keep indefinitely</option>
              </select>
            </div>
          </div>
          <div className="settings-block" style={{ marginTop: 14 }}>
            <div className="settings-label" style={{ marginBottom: 8 }}>Improve transcription accuracy</div>
            <div className="settings-help" style={{ marginBottom: 14 }}>Review previous transcriptions to help the AI learn your speaking patterns and terminology.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn small"><span className="icon">{I.doc}</span> Review Transcripts</button>
              <button className="btn small"><span className="icon">{I.mic}</span> Review Recordings</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Appearance ── */}
      {tab === 'appearance' && (
        <AppearanceSection theme={theme} setTheme={setTheme} mode={mode} setMode={setMode} />
      )}

      {/* ── Workflows ── */}
      {tab === 'workflows' && <WorkflowsSection />}

      {/* ── Privacy ── */}
      {tab === 'privacy' && (
        <div className="settings-section">
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
      )}

      {/* ── Account ── */}
      {tab === 'account' && <AccountSection userName={userName} />}
    </>
  );
}

// ── Workflows section ────────────────────────────────────────
function WorkflowsSection() {
  const { workflows, setWorkflows } = useWorkflows();
  const { templates } = useTemplates();
  const [editingId, setEditingId] = useState<string | null>(null);

  const update = (id: string, updater: (w: Workflow) => Workflow) => {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? updater(w) : w)));
  };

  const createNew = () => {
    const id = 'wf_' + crypto.randomUUID().slice(0, 8);
    const next: Workflow = {
      id, name: 'New workflow', heb: 'מסלול חדש',
      templateId: templates[0]?.id || '',
      phases: ['Meet', 'Capture', 'Draft', 'Deliver'],
      defaultView: 'detailed', showSpine: true, autoSeal: false,
    };
    setWorkflows((prev) => [...prev, next]);
    setEditingId(id);
  };

  return (
    <div className="settings-section">
      <div style={{
        padding: '14px 18px', background: 'var(--bg-card-hi)',
        border: '1px solid var(--rule-soft)', borderRadius: 6,
        fontFamily: 'Cormorant Garamond, serif', fontSize: 15, color: 'var(--ink-1)',
        marginBottom: 16, lineHeight: 1.5, fontStyle: 'italic',
      }}>
        A workflow defines the phases a file moves through, paired with a template.
      </div>

      {workflows.map((w) => {
        const isEditing = editingId === w.id;
        const tpl = templates.find((t) => t.id === w.templateId);
        return (
          <div key={w.id} className="workflow-card">
            <div className="workflow-card-head">
              <div>
                {isEditing ? (
                  <input className="input serif" value={w.name}
                    onChange={(e) => update(w.id, (p) => ({ ...p, name: e.target.value }))}
                    style={{ fontFamily: 'Frank Ruhl Libre', fontSize: 18, fontWeight: 700, padding: '4px 8px' }} />
                ) : (
                  <div className="workflow-name">{w.name}<span className="heb">· {w.heb}</span></div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isEditing ? (
                  <select className="input" value={w.templateId}
                    onChange={(e) => update(w.id, (p) => ({ ...p, templateId: e.target.value }))}
                    style={{ padding: '4px 8px', fontSize: 12 }}>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.en}</option>)}
                  </select>
                ) : (
                  <span className="workflow-template-chip">→ {tpl?.en || w.templateId}</span>
                )}
                <button className="btn ghost small" onClick={() => setEditingId(isEditing ? null : w.id)}>
                  {isEditing ? 'Done' : 'Edit'}
                </button>
              </div>
            </div>
            <div className="workflow-phases">
              {w.phases.map((p, i) => (
                <div key={i} className="workflow-phase">
                  <span className="workflow-phase-num">{i + 1}</span>
                  {isEditing ? (
                    <input value={p} onChange={(e) => update(w.id, (prev) => ({
                      ...prev, phases: prev.phases.map((x, j) => (j === i ? e.target.value : x)),
                    }))} style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--ink-1)', minWidth: 80, padding: 0 }} />
                  ) : p}
                  {isEditing && w.phases.length > 2 && (
                    <button className="remove" onClick={() => update(w.id, (prev) => ({
                      ...prev, phases: prev.phases.filter((_, j) => j !== i),
                    }))}>×</button>
                  )}
                </div>
              ))}
              {isEditing && (
                <button className="workflow-phase" style={{ background: 'transparent', borderStyle: 'dashed', cursor: 'pointer' }}
                  onClick={() => update(w.id, (prev) => ({ ...prev, phases: [...prev.phases, 'New phase'] }))}>
                  + Add phase
                </button>
              )}
            </div>
            <div className="workflow-options">
              <label>
                <input type="checkbox" checked={w.showSpine}
                  onChange={(e) => update(w.id, (p) => ({ ...p, showSpine: e.target.checked }))}
                  style={{ accentColor: 'var(--accent)' }} />
                Show status spine on cards
              </label>
              <label>
                <input type="checkbox" checked={w.autoSeal}
                  onChange={(e) => update(w.id, (p) => ({ ...p, autoSeal: e.target.checked }))}
                  style={{ accentColor: 'var(--accent)' }} />
                Apply pastoral seal by default
              </label>
              <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--ink-3)' }}>Default card view:</span>
                <ViewToggle value={w.defaultView} onChange={(v) => update(w.id, (p) => ({ ...p, defaultView: v }))} />
              </div>
            </div>
          </div>
        );
      })}
      <button className="btn small" onClick={createNew} style={{ marginTop: 8 }}>+ New workflow</button>
    </div>
  );
}

// ── Account (with archived files from Plan 3) ───────────────
function AccountSection({ userName }: { userName: string }) {
  const [archived, setArchived] = useState<Encounter[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const { refresh } = useEncounters();

  const loadArchived = async () => {
    setLoadingArchived(true);
    try {
      const data = await api.encounters.list({ includeArchived: true });
      setArchived((data.encounters || []).filter((e: Encounter) => !!e.archivedAt));
    } finally { setLoadingArchived(false); }
  };

  useEffect(() => { loadArchived(); }, []);

  const restore = async (enc: Encounter) => {
    await api.encounters.unarchive(enc.id);
    await refresh();
    await loadArchived();
  };

  const eraseAll = async () => {
    for (const enc of archived) { await api.encounters.delete(enc.id); }
    setEraseOpen(false);
    await refresh();
    await loadArchived();
  };

  return (
    <div className="settings-section">
      <div className="settings-block">
        <div className="settings-row">
          <div>
            <div className="settings-label">Signed in as {userName || 'User'}</div>
            <div className="settings-help">via Google OAuth</div>
          </div>
          <a href="/api/auth/logout" className="btn small" style={{ color: 'var(--accent)' }}>Sign Out</a>
        </div>
      </div>

      <div className="settings-block">
        <div className="settings-row settings-row-stack">
          <div>
            <div className="settings-label">Archived files</div>
            <div className="settings-help">Files archived from their card menu. Hidden from your list but kept indefinitely.</div>
          </div>
        </div>
        {loadingArchived ? (
          <div className="mono" style={{ color: 'var(--ink-3)', padding: '12px 0' }}>Loading...</div>
        ) : archived.length === 0 ? (
          <div style={{ padding: '14px 0', fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 14 }}>No archived files.</div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              {archived.map((enc) => (
                <div key={enc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-card-hi)', border: '1px solid var(--rule-soft)', borderRadius: 4 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Frank Ruhl Libre, serif', fontWeight: 700, fontSize: 16 }}>{enc.subject || enc.congregantName}</div>
                    <div className="mono" style={{ color: 'var(--ink-3)' }}>Archived {enc.archivedAt ? new Date(enc.archivedAt).toLocaleDateString() : ''}</div>
                  </div>
                  <button className="btn ghost small" onClick={() => restore(enc)}>Restore</button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn destructive small" onClick={() => setEraseOpen(true)}>Erase all archived files...</button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={eraseOpen}
        title={`Erase all ${archived.length} archived file${archived.length === 1 ? '' : 's'}?`}
        description="This permanently deletes every archived file. There is no recovery."
        confirmText="ERASE ALL"
        confirmLabel="Erase forever"
        onCancel={() => setEraseOpen(false)}
        onConfirm={eraseAll}
      />
    </div>
  );
}

// ── Appearance ──────────────────────────────────────────────
function AppearanceSection({ theme, setTheme, mode, setMode }: { theme: string; setTheme: (v: any) => void; mode: string; setMode: (v: any) => void }) {
  return (
    <div className="settings-section">
      <div className="settings-block">
        <div className="settings-label" style={{ marginBottom: 12 }}>Theme</div>
        <div className="theme-grid">
          {([
            { key: 'warm', label: 'Warm', sub: 'Parchment & oxblood', colors: ['#f0e7d2', '#7a2e2a', '#a87a2c'] },
            { key: 'cool', label: 'Cool', sub: 'Stone & slate', colors: ['#e8ebf0', '#2f4866', '#6d6a4a'] },
            { key: 'sacred', label: 'Sacred', sub: 'Deep night & gold', colors: ['#1b2038', '#d4a955', '#8aa07a'] },
          ] as const).map((t) => (
            <button key={t.key} className={`theme-card ${theme === t.key ? 'active' : ''}`} onClick={() => setTheme(t.key)}>
              <div className="theme-card-preview" style={{ display: 'flex' }}>
                {t.colors.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
              </div>
              <div className="theme-card-label">{t.label}</div>
              <div className="theme-card-sub">{t.sub}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 16 }}>
          <div className="settings-label" style={{ marginBottom: 8 }}>Mode</div>
          <div className="mode-toggle">
            {(['light', 'dark', 'auto'] as const).map((m) => (
              <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
