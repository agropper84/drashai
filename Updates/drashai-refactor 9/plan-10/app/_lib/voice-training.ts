// Voice strength helper. Pure function — no React, no fetch.
import type { Template } from './types';

export type VoiceLevel = 'none' | 'starter' | 'developing' | 'established' | 'rich';

export interface VoiceStrength {
  level: VoiceLevel;
  docCount: number;
  totalChars: number;
  /** 0..1 — for the meter fill. */
  ratio: number;
  hint: string;
}

const TIERS: { level: VoiceLevel; min: number; hint: string }[] = [
  { level: 'rich',        min: 25_000, hint: 'Your voice is well-trained.' },
  { level: 'established', min: 8_000,  hint: 'Strong voice signal — generation will sound like you.' },
  { level: 'developing',  min: 2_000,  hint: 'Halfway there. A few more samples sharpen the voice.' },
  { level: 'starter',     min: 200,    hint: 'A start. Two or three more samples will help a lot.' },
  { level: 'none',        min: 0,      hint: 'Add a sample of your writing — past sermon, eulogy, or notes.' },
];

export function voiceStrength(template: Template): VoiceStrength {
  const docs = template.styleDocuments || [];
  const docCount = docs.length;
  const totalChars = docs.reduce((sum, d) => sum + (d.excerpt?.length || 0), 0);

  // Use the larger signal: doc count (caps at ~8) or total chars.
  const charScore = Math.min(totalChars / 25_000, 1);
  const tier = TIERS.find((t) => totalChars >= t.min) || TIERS[TIERS.length - 1];

  return {
    level: tier.level,
    docCount,
    totalChars,
    ratio: charScore,
    hint: tier.hint,
  };
}
