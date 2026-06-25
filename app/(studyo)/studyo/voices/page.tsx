'use client';
// Screen 9: Voice gallery. Placeholder for Phase 5.

import { useState } from 'react';
import { CURATED_VOICES, getVoicesByCategory } from '@/app/(studyo)/_lib/studyo-voices';

const FILTERS = ['all', 'narration', 'conversation', 'character'];

export default function VoicesPage() {
  const [filter, setFilter] = useState('all');
  const voices = getVoicesByCategory(filter);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="sy-eyebrow" style={{ marginBottom: 8 }}>Voices</div>
          <div className="sy-page-title">Your voice gallery</div>
          <div className="sy-greeting" style={{ marginTop: 4 }}>Curated by us, or designed by you with ElevenLabs</div>
        </div>
        <button className="sy-new-project" style={{ width: 'auto', marginTop: 0, padding: '12px 20px' }}>
          ✦ Create a voice
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit', border: 'none',
              background: filter === f ? '#222831' : 'transparent',
              color: filter === f ? '#E4E6EA' : '#8b91a0',
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {voices.map(v => (
          <div key={v.id} style={{
            background: '#1B1F27', border: '1px solid #242932',
            borderRadius: 16, padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 50, height: 50, borderRadius: '50%',
                background: v.color, color: '#15181E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700,
              }}>{v.initials}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{v.name}</div>
                <div style={{ fontSize: 11.5, color: '#8b91a0' }}>Best for {v.best}</div>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#aab0bd', lineHeight: 1.5, marginBottom: 14, minHeight: 58 }}>
              {v.desc}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {v.tags.map(t => (
                <span key={t} style={{
                  fontSize: 11, color: '#8b91a0', background: '#222831',
                  padding: '3px 8px', borderRadius: 6,
                }}>{t}</span>
              ))}
            </div>
            <button style={{
              width: '100%', background: 'transparent',
              border: '1px solid #2e3540', borderRadius: 9,
              padding: '9px 14px', fontSize: 13, fontWeight: 600,
              color: '#aab0bd', cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Use in a session →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
