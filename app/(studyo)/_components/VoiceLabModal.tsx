'use client';
// Voice Lab modal — design a voice from description or clone from audio sample.

import { useRef, useState } from 'react';

type Tab = 'design' | 'clone';

const TAG_OPTIONS = ['Warm', 'Crisp', 'British', 'American', 'Narrator', 'Academic', 'Relaxed', 'Energetic', 'Deep', 'Light'];
const COLORS = ['#D49A5A', '#C9883B', '#8FA37C', '#6E8BA8', '#9488B0', '#B5746A', '#C97D7D', '#5a9e8f'];

interface Props {
  onClose: () => void;
  onCreate: (voice: { name: string; desc: string; tags: string[]; category: string; color: string }) => void;
}

export function VoiceLabModal({ onClose, onCreate }: Props) {
  const [tab, setTab] = useState<Tab>('design');

  // Design state
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [age, setAge] = useState(50);
  const [energy, setEnergy] = useState(50);
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [customTag, setCustomTag] = useState('');
  const [color, setColor] = useState('#D49A5A');
  const [category, setCategory] = useState('narration');

  // Clone state
  const [cloneName, setCloneName] = useState('');
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleTag = (t: string) => {
    setTags(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const addCustomTag = () => {
    if (customTag.trim() && !tags.has(customTag.trim())) {
      setTags(prev => new Set(prev).add(customTag.trim()));
      setCustomTag('');
    }
  };

  const handleDesign = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), desc: desc.trim(), tags: [...tags], category, color });
  };

  const handleClone = () => {
    if (!cloneName.trim() || !cloneFile) return;
    // In production: upload audio to ElevenLabs clone API
    onCreate({ name: cloneName.trim(), desc: 'Cloned voice', tags: ['Custom'], category: 'character', color });
  };

  return (
    <div className="sy-modal-scrim" onClick={onClose}>
      <div className="sy-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="sy-modal-head">
          <span style={{ fontSize: 16, fontWeight: 700 }}>Voice lab</span>
          <button className="sy-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tab switcher */}
        <div className="sy-tab-switcher">
          <button className={`sy-tab-btn${tab === 'design' ? ' active' : ''}`} onClick={() => setTab('design')}>
            Design from a description
          </button>
          <button className={`sy-tab-btn${tab === 'clone' ? ' active' : ''}`} onClick={() => setTab('clone')}>
            Clone from a sample
          </button>
        </div>

        {tab === 'design' && (
          <>
            <div className="sy-field-label" style={{ marginTop: 16 }}>Name</div>
            <input className="sy-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Professor Chen" autoFocus />

            <div className="sy-field-label" style={{ marginTop: 14 }}>Describe the voice</div>
            <textarea className="sy-textarea" value={desc} onChange={e => setDesc(e.target.value)} placeholder="A calm, gravelly older man with a slight British accent..." rows={3} />

            <div className="sy-field-label" style={{ marginTop: 14 }}>Character</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6d7383', marginBottom: 4 }}>
                  <span>Younger</span><span>Older</span>
                </div>
                <input type="range" min={0} max={100} value={age} onChange={e => setAge(Number(e.target.value))} className="sy-slider" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6d7383', marginBottom: 4 }}>
                  <span>Calm</span><span>Lively</span>
                </div>
                <input type="range" min={0} max={100} value={energy} onChange={e => setEnergy(Number(e.target.value))} className="sy-slider" />
              </div>
            </div>

            <div className="sy-field-label">Category</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {['narration', 'conversation', 'character'].map(c => (
                <button key={c} className={`sy-voice-chip${category === c ? ' active' : ''}`} onClick={() => setCategory(c)} style={{ padding: '5px 12px' }}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>

            <div className="sy-field-label">Color</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c,
                    border: color === c ? '2px solid #E4E6EA' : '2px solid transparent',
                    cursor: 'pointer', padding: 0,
                  }}
                />
              ))}
            </div>

            <div className="sy-field-label">Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {TAG_OPTIONS.map(t => (
                <button key={t} className={`sy-tag-chip${tags.has(t) ? ' active' : ''}`} onClick={() => toggleTag(t)}>
                  {t}
                </button>
              ))}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <input
                  className="sy-tag-input"
                  value={customTag}
                  onChange={e => setCustomTag(e.target.value)}
                  placeholder="+ tag"
                  onKeyDown={e => { if (e.key === 'Enter') addCustomTag(); }}
                />
              </div>
            </div>

            <div className="sy-modal-footer">
              <button className="sy-btn-outline" onClick={onClose}>Cancel</button>
              <button className="sy-btn-primary" onClick={handleDesign} disabled={!name.trim()}>✦ Generate voice</button>
            </div>
          </>
        )}

        {tab === 'clone' && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.webm"
              onChange={e => { const f = e.target.files?.[0]; if (f) setCloneFile(f); }}
              style={{ display: 'none' }}
            />

            <div
              className="sy-clone-dropzone"
              onClick={() => fileRef.current?.click()}
              style={{ marginTop: 16 }}
            >
              {cloneFile ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#E4E6EA' }}>{cloneFile.name}</div>
                  <div style={{ fontSize: 12, color: '#8b91a0' }}>
                    {(cloneFile.size / 1024 / 1024).toFixed(1)} MB · Click to replace
                  </div>
                </>
              ) : (
                <>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D49A5A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="1" width="6" height="12" rx="3"/><path d="M19 10v1a7 7 0 01-14 0v-1"/><line x1="12" y1="19" x2="12" y2="23"/>
                  </svg>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>Upload or record a sample</div>
                  <div style={{ fontSize: 12, color: '#8b91a0', maxWidth: 280, lineHeight: 1.5, textAlign: 'center' }}>
                    30 seconds of clean speech is enough for a strong clone.
                  </div>
                  <button className="sy-btn-outline" style={{ marginTop: 4, padding: '7px 16px', fontSize: 12 }}>
                    Upload audio
                  </button>
                </>
              )}
            </div>

            <div className="sy-field-label" style={{ marginTop: 14 }}>Name</div>
            <input className="sy-input" value={cloneName} onChange={e => setCloneName(e.target.value)} placeholder="Name this voice" />

            <div className="sy-modal-footer">
              <button className="sy-btn-outline" onClick={onClose}>Cancel</button>
              <button className="sy-btn-primary" onClick={handleClone} disabled={!cloneName.trim() || !cloneFile}>✦ Build voice</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
