'use client';
// Plan 3 — adds an Archived Files panel in the Account section.
// All sections from Plans 1 & 2 are preserved.

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

export default function SettingsPage() {
  const { theme, setTheme, mode, setMode } = useTheme();
  const [claudeKey, setClaudeKey] = useState('');
  const [elevenKey, setElevenKey] = useState('');
  const [hasClaudeKey, setHasClaudeKey] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);
  const [keysSaved, setKeysSaved] = useState(false);

  useEffect(() => {
    api.settings.get().then((d) => {
      if (d) setHasClaudeKey(!!d.hasClaudeKey);
    }).catch(() => {});
  }, []);

  const handleSaveKeys = async () => {
    setSavingKeys(true);
    try {
      const body: Record<string, string> = {};
      if (claudeKey) body.claudeApiKey = claudeKey;
      if (elevenKey) body.elevenlabsApiKey = elevenKey;
      await api.settings.save(body);
      setKeysSaved(true);
      setHasClaudeKey(!!claudeKey || hasClaudeKey);
      setTimeout(() => setKeysSaved(false), 2000);
      setClaudeKey('');
      setElevenKey('');
    } finally {
      setSavingKeys(false);
    }
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

      <KeysSection
        claudeKey={claudeKey} setClaudeKey={setClaudeKey}
        elevenKey={elevenKey} setElevenKey={setElevenKey}
        hasClaudeKey={hasClaudeKey}
        savingKeys={savingKeys} keysSaved={keysSaved}
        onSave={handleSaveKeys}
      />

      <WorkflowsSection/>

      <AppearanceSection theme={theme} setTheme={setTheme} mode={mode} setMode={setMode}/>

      <div className="settings-section">
        <h2 className="settings-h">הנחיות</h2>
        <div className="settings-h-en">Prompts</div>
        <div className="settings-block">
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            AI generation prompts are managed per template.
          </p>
          <Link href="/templates" className="btn small" style={{ marginTop: 12, textDecoration: 'none' }}>
            <span className="icon">{I.templ}</span> Go to Templates
          </Link>
        </div>
      </div>

      {/* Account — includes Archived panel */}
      <AccountSection/>
    </>
  );
}

// ─── Account section (Plan 3 additions) ─────────────────────
function AccountSection() {
  const [archived, setArchived] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(false);
  const [eraseOpen, setEraseOpen] = useState(false);
  const { refresh } = useEncounters();

  const loadArchived = async () => {
    setLoading(true);
    try {
      const data = await api.encounters.list({ includeArchived: true });
      setArchived(data.encounters.filter((e) => !!e.archivedAt));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadArchived(); }, []);

  const restore = async (enc: Encounter) => {
    await api.encounters.unarchive(enc.id);
    await refresh();
    await loadArchived();
  };

  const eraseAll = async () => {
    for (const enc of archived) {
      await api.encounters.delete(enc.id);
    }
    setEraseOpen(false);
    await refresh();
    await loadArchived();
  };

  return (
    <div className="settings-section">
      <h2 className="settings-h">חשבון</h2>
      <div className="settings-h-en">Account</div>

      <div className="settings-block">
        <div className="settings-row">
          <div>
            <div className="settings-label">Signed in</div>
            <div className="settings-help">via Google OAuth</div>
          </div>
          <a href="/api/auth/logout" className="btn small" style={{ color: 'var(--accent)' }}>
            Sign Out
          </a>
        </div>
      </div>

      <div className="settings-block">
        <div className="settings-row settings-row-stack">
          <div>
            <div className="settings-label">Archived files</div>
            <div className="settings-help">
              Files you archived from their card menu. They're hidden from your list but
              kept indefinitely. Restore one, or erase all of them at once.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mono" style={{ color: 'var(--ink-3)', padding: '12px 0' }}>Loading...</div>
        ) : archived.length === 0 ? (
          <div style={{
            padding: '14px 0', fontFamily: 'Cormorant Garamond, serif',
            fontStyle: 'italic', color: 'var(--ink-3)', fontSize: 14,
          }}>
            No archived files.
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
              {archived.map((enc) => (
                <div key={enc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: 'var(--bg-card-hi)',
                  border: '1px solid var(--rule-soft)',
                  borderRadius: 4,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'Frank Ruhl Libre, serif', fontWeight: 700,
                      fontSize: 16, color: 'var(--ink-1)',
                    }}>
                      {enc.subject || enc.congregantName}
                    </div>
                    <div className="mono" style={{ color: 'var(--ink-3)' }}>
                      Archived {enc.archivedAt ? new Date(enc.archivedAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <button className="btn ghost small" onClick={() => restore(enc)}>
                    Restore
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn destructive small" onClick={() => setEraseOpen(true)}>
                Erase all archived files…
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={eraseOpen}
        title={`Erase all ${archived.length} archived file${archived.length === 1 ? '' : 's'}?`}
        description="This permanently deletes every archived file along with its transcript, drafts, sources, and notes. There is no recovery after this."
        confirmText="ERASE ALL"
        confirmLabel="Erase forever"
        onCancel={() => setEraseOpen(false)}
        onConfirm={eraseAll}
      />
    </div>
  );
}

// ─── Workflows (unchanged from Plan 2) ─────────────────────
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
      <h2 className="settings-h">מסלולים</h2>
      <div className="settings-h-en">Workflows</div>

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
                  <input
                    className="input serif"
                    value={w.name}
                    onChange={(e) => update(w.id, (p) => ({ ...p, name: e.target.value }))}
                    style={{ fontFamily: 'Frank Ruhl Libre', fontSize: 18, fontWeight: 700, padding: '4px 8px' }}
                  />
                ) : (
                  <div className="workflow-name">
                    {w.name}<span className="heb">· {w.heb}</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isEditing ? (
                  <select
                    className="input"
                    value={w.templateId}
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
                    <input
                      value={p}
                      onChange={(e) => update(w.id, (prev) => ({ ...prev, phases: prev.phases.map((x, j) => (j === i ? e.target.value : x)) }))}
                      style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: 12, color: 'var(--ink-1)', minWidth: 80, padding: 0 }}
                    />
                  ) : p}
                  {isEditing && w.phases.length > 2 && (
                    <button className="remove" onClick={() => update(w.id, (prev) => ({ ...prev, phases: prev.phases.filter((_, j) => j !== i) }))}>×</button>
                  )}
                </div>
              ))}
              {isEditing && (
                <button
                  className="workflow-phase"
                  style={{ background: 'transparent', borderStyle: 'dashed', cursor: 'pointer' }}
                  onClick={() => update(w.id, (prev) => ({ ...prev, phases: [...prev.phases, 'New phase'] }))}>
                  + Add phase
                </button>
              )}
            </div>

            <div className="workflow-options">
              <label>
                <input type="checkbox" checked={w.showSpine}
                  onChange={(e) => update(w.id, (p) => ({ ...p, showSpine: e.target.checked }))}
                  style={{ accentColor: 'var(--accent)' }}/>
                Show status spine on cards
              </label>
              <label>
                <input type="checkbox" checked={w.autoSeal}
                  onChange={(e) => update(w.id, (p) => ({ ...p, autoSeal: e.target.checked }))}
                  style={{ accentColor: 'var(--accent)' }}/>
                Apply pastoral seal by default
              </label>
              <div style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--ink-3)' }}>Default card view:</span>
                <ViewToggle value={w.defaultView} onChange={(v) => update(w.id, (p) => ({ ...p, defaultView: v }))}/>
              </div>
            </div>
          </div>
        );
      })}

      <button className="btn small" onClick={createNew} style={{ marginTop: 8 }}>
        + New workflow
      </button>
    </div>
  );
}

// ─── Keys / Appearance (unchanged) ─────────────────────────
function KeysSection({ claudeKey, setClaudeKey, elevenKey, setElevenKey, hasClaudeKey, savingKeys, keysSaved, onSave }: {
  claudeKey: string; setClaudeKey: (v: string) => void;
  elevenKey: string; setElevenKey: (v: string) => void;
  hasClaudeKey: boolean; savingKeys: boolean; keysSaved: boolean;
  onSave: () => void;
}) {
  return (
    <div className="settings-section">
      <h2 className="settings-h">מפתחות AI</h2>
      <div className="settings-h-en">API Keys</div>
      <div className="settings-block">
        <div className="settings-row settings-row-stack">
          <div>
            <div className="settings-label">Anthropic (Claude)</div>
            <div className="settings-help">
              Required.{' '}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Get your key →</a>
            </div>
          </div>
          <div className="key-input" style={{ marginTop: 8 }}>
            <input className="input" type="password" value={claudeKey} onChange={(e) => setClaudeKey(e.target.value)} placeholder={hasClaudeKey ? '••••••••••••••••' : 'sk-ant-...'}/>
            <span className={`key-status ${hasClaudeKey ? 'connected' : 'empty'}`}>{hasClaudeKey ? '● Connected' : '○ Not set'}</span>
          </div>
        </div>
        <div className="settings-row settings-row-stack">
          <div>
            <div className="settings-label">ElevenLabs</div>
            <div className="settings-help">
              For voice transcription.{' '}
              <a href="https://elevenlabs.io/app/settings/api-keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Get your key →</a>
            </div>
          </div>
          <div className="key-input" style={{ marginTop: 8 }}>
            <input className="input" type="password" value={elevenKey} onChange={(e) => setElevenKey(e.target.value)} placeholder="xi-..."/>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button className="btn primary" onClick={onSave} disabled={savingKeys || (!claudeKey && !elevenKey)}>
            {keysSaved ? '✓ Saved' : savingKeys ? 'Saving...' : 'Save Keys'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppearanceSection({ theme, setTheme, mode, setMode }: { theme: string; setTheme: (v: any) => void; mode: string; setMode: (v: any) => void }) {
  return (
    <div className="settings-section">
      <h2 className="settings-h">מראה</h2>
      <div className="settings-h-en">Appearance</div>
      <div className="settings-block">
        <div className="settings-label" style={{ marginBottom: 12 }}>Theme</div>
        <div className="theme-grid">
          {([
            { key: 'warm',   label: 'Warm',   sub: 'Parchment & oxblood', colors: ['#f0e7d2', '#7a2e2a', '#a87a2c'] },
            { key: 'cool',   label: 'Cool',   sub: 'Stone & slate',       colors: ['#e8ebf0', '#2f4866', '#6d6a4a'] },
            { key: 'sacred', label: 'Sacred', sub: 'Deep night & gold',   colors: ['#1b2038', '#d4a955', '#8aa07a'] },
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
