'use client';
// Settings page — keys, appearance, prompts pointer, privacy, account.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { I } from '@/app/_components/Icons';
import { useTheme } from '@/app/_lib/theme';
import { api } from '@/app/_lib/api';

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
    } catch (err) {
      console.error('[Settings] save keys failed:', err);
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
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)' }}>
                  Get your API key →
                </a>
              </div>
            </div>
            <div className="key-input" style={{ marginTop: 8 }}>
              <input
                className="input"
                type="password"
                value={claudeKey}
                onChange={(e) => setClaudeKey(e.target.value)}
                placeholder={hasClaudeKey ? '••••••••••••••••' : 'sk-ant-...'}
              />
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
                <a
                  href="https://elevenlabs.io/app/settings/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--accent)' }}>
                  Get your API key →
                </a>
              </div>
            </div>
            <div className="key-input" style={{ marginTop: 8 }}>
              <input
                className="input"
                type="password"
                value={elevenKey}
                onChange={(e) => setElevenKey(e.target.value)}
                placeholder="xi-..."
              />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <button
              className="btn primary"
              onClick={handleSaveKeys}
              disabled={savingKeys || (!claudeKey && !elevenKey)}>
              {keysSaved ? '✓ Saved' : savingKeys ? 'Saving...' : 'Save Keys'}
            </button>
          </div>

          <div className="privacy-vow" style={{ marginTop: 14 }}>
            <div className="privacy-vow-title">
              <span className="icon" style={{ width: 12, height: 12 }}>{I.lock}</span> Security
            </div>
            <p style={{ fontSize: 14 }}>
              API keys are stored encrypted in your account. They never leave the server
              and are only used to make API calls on your behalf.
            </p>
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
            {([
              { key: 'warm',   label: 'Warm',   sub: 'Parchment & oxblood', colors: ['#f0e7d2', '#7a2e2a', '#a87a2c'] },
              { key: 'cool',   label: 'Cool',   sub: 'Stone & slate',       colors: ['#e8ebf0', '#2f4866', '#6d6a4a'] },
              { key: 'sacred', label: 'Sacred', sub: 'Deep night & gold',   colors: ['#1b2038', '#d4a955', '#8aa07a'] },
            ] as const).map((t) => (
              <button
                key={t.key}
                className={`theme-card ${theme === t.key ? 'active' : ''}`}
                onClick={() => setTheme(t.key)}>
                <div className="theme-card-preview" style={{ display: 'flex' }}>
                  {t.colors.map((c, i) => (
                    <div key={i} style={{ flex: 1, background: c }} />
                  ))}
                </div>
                <div className="theme-card-label">{t.label}</div>
                <div className="theme-card-sub">{t.sub}</div>
                {theme === t.key && (
                  <span className="check" style={{ position: 'absolute', top: 10, right: 10, width: 16, height: 16 }}>
                    {I.check}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <div className="settings-label" style={{ marginBottom: 8 }}>Mode</div>
            <div className="mode-toggle">
              {(['light', 'dark', 'auto'] as const).map((m) => (
                <button
                  key={m}
                  className={mode === m ? 'active' : ''}
                  onClick={() => setMode(m)}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Prompts — pointer to Templates */}
      <div className="settings-section">
        <h2 className="settings-h">הנחיות</h2>
        <div className="settings-h-en">Prompts</div>
        <div className="settings-block">
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            AI generation prompts are managed per template. Open any template to edit
            its prompt, style examples, and context variables.
          </p>
          <Link href="/templates" className="btn small" style={{ marginTop: 12, textDecoration: 'none' }}>
            <span className="icon">{I.templ}</span> Go to Templates
          </Link>
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
            <div className="mode-toggle">
              <button className="active">On</button>
              <button>Off</button>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Auto-redact names on export</div>
              <div className="settings-help">Replace congregant names with initials when sharing</div>
            </div>
            <div className="mode-toggle">
              <button className="active">On</button>
              <button>Off</button>
            </div>
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
            <a href="/api/auth/logout" className="btn small" style={{ color: 'var(--accent)' }}>
              Sign Out
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
