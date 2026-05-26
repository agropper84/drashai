'use client';
// Promoted UI for style documents. Strength meter + drop area + paste-excerpt
// button. Lives at the TOP of the Template editor.

import { voiceStrength } from '@/app/_lib/voice-training';
import { api } from '@/app/_lib/api';
import type { Template } from '@/app/_lib/types';

export interface VoiceTrainingSectionProps {
  template: Template;
  onChange: (updater: (t: Template) => Template) => void;
}

export function VoiceTrainingSection({ template, onChange }: VoiceTrainingSectionProps) {
  const strength = voiceStrength(template);
  const docs = template.styleDocuments || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await api.uploadDocument(file, 'templates');
      let excerpt = '';
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        excerpt = await file.text().then((t) => t.substring(0, 4000));
      }
      onChange((p) => ({
        ...p,
        styleDocuments: [...(p.styleDocuments || []), { name: file.name, url: data.url, excerpt }],
      }));
    } catch (err) {
      console.error('[VoiceTraining] upload failed:', err);
    }
    e.target.value = '';
  };

  const handlePaste = () => {
    const text = prompt("Paste a passage in your voice (past sermon, eulogy, notes...):");
    if (text?.trim()) {
      onChange((p) => ({
        ...p,
        styleDocuments: [
          ...(p.styleDocuments || []),
          { name: `Excerpt ${(p.styleDocuments?.length || 0) + 1}`, url: '', excerpt: text.trim() },
        ],
      }));
    }
  };

  return (
    <div className="voice-training">
      <div className="voice-training-head">
        <div>
          <div className="voice-training-eyebrow">Voice training</div>
          <div className="voice-training-title">Teach the AI to write like you</div>
          <div className="voice-training-subtitle">
            Upload past sermons, eulogies, or notes. The AI will match your tone, structure, and rhythm.
          </div>
        </div>
        <div className="voice-training-strength">
          <div className={`voice-training-level level-${strength.level}`}>
            {strength.level === 'none' ? 'No samples yet' : strength.level}
          </div>
          <div className="voice-training-meter">
            <div className="voice-training-meter-fill" style={{ width: `${strength.ratio * 100}%` }}/>
          </div>
          <div className="voice-training-meter-meta">
            {strength.docCount} sample{strength.docCount === 1 ? '' : 's'} · {(strength.totalChars / 1000).toFixed(1)}k chars
          </div>
        </div>
      </div>

      <div className="voice-training-hint">{strength.hint}</div>

      {docs.length > 0 && (
        <div className="voice-training-list">
          {docs.map((doc, i) => (
            <div key={i} className="voice-training-doc">
              <div className="voice-training-doc-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="voice-training-doc-name">{doc.name}</div>
                {doc.excerpt && (
                  <div className="voice-training-doc-excerpt">
                    {doc.excerpt.substring(0, 100)}{doc.excerpt.length > 100 ? '…' : ''}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => onChange((p) => ({
                  ...p,
                  styleDocuments: (p.styleDocuments || []).filter((_, j) => j !== i),
                }))}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="voice-training-actions">
        <label className="btn primary" style={{ cursor: 'pointer' }}>
          + Upload sample
          <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={handleUpload}/>
        </label>
        <button type="button" className="btn" onClick={handlePaste}>
          Paste excerpt
        </button>
      </div>
    </div>
  );
}
