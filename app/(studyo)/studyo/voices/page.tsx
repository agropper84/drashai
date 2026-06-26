'use client';
// Screen 9: Voice gallery — browse, preview, create custom voices.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CURATED_VOICES } from '@/app/(studyo)/_lib/studyo-voices';
import { VoiceLabModal } from '@/app/(studyo)/_components/VoiceLabModal';
import type { StudyoVoice } from '@/app/(studyo)/_lib/studyo-types';

type Filter = 'all' | 'narration' | 'conversation' | 'character' | 'yours';

export default function VoicesPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [customVoices, setCustomVoices] = useState<StudyoVoice[]>([]);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [showLab, setShowLab] = useState(false);

  // Fetch custom voices
  useEffect(() => {
    fetch('/api/studyo/voices').then(r => r.json()).then(data => {
      if (data.custom) setCustomVoices(data.custom);
    }).catch(() => {});
  }, []);

  const allVoices = [...CURATED_VOICES, ...customVoices];

  const filtered = filter === 'all' ? allVoices
    : filter === 'yours' ? customVoices
    : allVoices.filter(v => v.category === filter);

  const handleCreate = async (voice: { name: string; desc: string; tags: string[]; category: string; color: string }) => {
    try {
      const res = await fetch('/api/studyo/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voice),
      });
      const { voice: created } = await res.json();
      setCustomVoices(prev => [...prev, created]);
      setShowLab(false);
      setFilter('yours');
    } catch { /* silent */ }
  };

  const togglePreview = (id: string) => {
    // In production: play/stop ElevenLabs preview audio
    setPreviewingId(prev => prev === id ? null : id);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="sy-eyebrow" style={{ marginBottom: 8 }}>Voices</div>
          <div className="sy-page-title">Your voice gallery</div>
          <div className="sy-greeting" style={{ marginTop: 4 }}>Curated by us, or designed by you with ElevenLabs</div>
        </div>
        <button className="sy-btn-primary" style={{ padding: '12px 20px', fontSize: 14, flexShrink: 0 }} onClick={() => setShowLab(true)}>
          ✦ Create a voice
        </button>
      </div>

      {/* Filters */}
      <div className="sy-voice-filters">
        {(['all', 'narration', 'conversation', 'character', 'yours'] as Filter[]).map(f => (
          <button
            key={f}
            className={`sy-voice-filter${filter === f ? ' active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'yours' ? `Your voices${customVoices.length ? ` (${customVoices.length})` : ''}` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Empty state for "Your voices" */}
      {filter === 'yours' && customVoices.length === 0 ? (
        <div className="sy-voice-empty" onClick={() => setShowLab(true)}>
          <div style={{ fontSize: 32, opacity: 0.2, marginBottom: 12 }}>♪</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No custom voices yet</div>
          <div style={{ fontSize: 13, color: '#8b91a0', marginBottom: 16 }}>
            Design one from a description or clone your own voice.
          </div>
          <button className="sy-btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>Create your first voice</button>
        </div>
      ) : (
        <div className="sy-voice-grid-page">
          {filtered.map(v => (
            <div key={v.id} className="sy-vcard">
              {/* Header */}
              <div className="sy-vcard-head">
                <div className="sy-vcard-avatar" style={{ background: v.color }}>{v.initials}</div>
                <div className="sy-vcard-title">
                  <div className="sy-vcard-name">
                    {v.name}
                    {v.custom && <span className="sy-vcard-yours">YOURS</span>}
                  </div>
                  <div className="sy-vcard-best">Best for {v.best}</div>
                </div>
              </div>

              {/* Description */}
              <div className="sy-vcard-desc">{v.desc}</div>

              {/* Preview strip */}
              <button className="sy-vcard-preview" onClick={() => togglePreview(v.id)}>
                {previewingId === v.id ? (
                  <>
                    <div className="sy-vcard-eq">
                      {[0, 1, 2, 3, 4].map(i => (
                        <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
                      ))}
                    </div>
                    <span style={{ color: '#D49A5A' }}>Previewing...</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#6d7383" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    <span>Preview</span>
                  </>
                )}
              </button>

              {/* Tags */}
              <div className="sy-vcard-tags">
                {v.tags.map(t => (
                  <span key={t} className="sy-vcard-tag">{t}</span>
                ))}
              </div>

              {/* Action */}
              <button
                className="sy-vcard-action"
                onClick={() => router.push(`/studyo?voice=${v.id}`)}
              >
                Use in a session →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Voice Lab Modal */}
      {showLab && (
        <VoiceLabModal onClose={() => setShowLab(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
