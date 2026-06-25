// Curated voice library — seed data from DATA_MODEL.md

import type { StudyoVoice } from './studyo-types';

export const CURATED_VOICES: StudyoVoice[] = [
  // Narration
  { id: 'marlowe', name: 'Marlowe', desc: 'Warm baritone with measured pacing — like a late-night documentary narrator who genuinely loves the subject.', initials: 'Ma', color: '#C9883B', category: 'narration', tags: ['Warm', 'Baritone', 'Measured'], best: 'Lectures & long reads', custom: false },
  { id: 'reed', name: 'Reed', desc: 'Clear, authoritative, slightly clipped — a documentary voice that keeps you moving forward.', initials: 'Re', color: '#6E8BA8', category: 'narration', tags: ['Clear', 'Authoritative', 'Documentary'], best: 'Summaries & quick reviews', custom: false },
  { id: 'hale', name: 'Professor Hale', desc: "Gravelly British academic who's seen everything twice and finds it all fascinating. Slightly dry wit.", initials: 'PH', color: '#8FA37C', category: 'narration', tags: ['British', 'Gravelly', 'Academic'], best: 'Socratic tutoring & debate', custom: false },
  // Conversation
  { id: 'june', name: 'June', desc: 'Bright, upbeat, genuinely curious — the friend who makes you want to keep explaining things.', initials: 'Ju', color: '#D49A5A', category: 'conversation', tags: ['Bright', 'Upbeat', 'Curious'], best: 'Podcast host (energetic)', custom: false },
  { id: 'ada', name: 'Ada', desc: 'Crisp and academic but approachable — asks sharp questions and knows when to push.', initials: 'Ad', color: '#B5746A', category: 'conversation', tags: ['Crisp', 'Academic', 'Sharp'], best: 'Podcast host (analytical)', custom: false },
  { id: 'theo', name: 'Theo', desc: 'Relaxed and thoughtful — the co-host who synthesizes and translates jargon into plain language.', initials: 'Th', color: '#9488B0', category: 'conversation', tags: ['Relaxed', 'Thoughtful', 'Accessible'], best: 'Podcast co-host', custom: false },
  // Character
  { id: 'saoirse', name: 'Saoirse', desc: "Irish lilt, warm and rhythmic — turns any explanation into a story you'd overhear in a pub.", initials: 'Sa', color: '#8FA37C', category: 'character', tags: ['Irish', 'Warm', 'Storyteller'], best: 'Narrative & history', custom: false },
  { id: 'wren', name: 'Wren', desc: 'Intimate, close-mic storyteller — as if someone is reading aloud just to you.', initials: 'Wr', color: '#C97D7D', category: 'character', tags: ['Intimate', 'Close-mic', 'Personal'], best: 'Bedtime-study narration', custom: false },
  { id: 'nova', name: 'Nova', desc: 'Energetic and punchy — packs information tight and keeps the pace high without sacrificing clarity.', initials: 'No', color: '#D49A5A', category: 'character', tags: ['Energetic', 'Punchy', 'Fast-paced'], best: 'Exam prep & quick reviews', custom: false },
];

export function getVoice(id: string): StudyoVoice | undefined {
  return CURATED_VOICES.find(v => v.id === id);
}

export function getVoicesByCategory(category?: string): StudyoVoice[] {
  if (!category || category === 'all') return CURATED_VOICES;
  return CURATED_VOICES.filter(v => v.category === category);
}
