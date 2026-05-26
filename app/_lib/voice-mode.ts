// Pure mapping between the new 4-stop Voice slider and the existing
// aiMode + preserveLevel that /api/rav/generate already accepts.

export type VoiceStop = 1 | 2 | 3 | 4;
export type AiMode = 'heavy' | 'collab' | 'light';

export interface VoiceDescriptor {
  stop: VoiceStop;
  label: string;
  /** Italic helper line shown beneath the slider. */
  detail: string;
  aiMode: AiMode;
  /** Default preserve level for this stop. Stops 2 & 3 let the user tweak it. */
  preserveLevel: number;
  /** Whether the More-options preserve slider should be visible. */
  preserveAdjustable: boolean;
}

export const VOICE_STOPS: VoiceDescriptor[] = [
  {
    stop: 1,
    label: 'Just check facts',
    detail: 'AI fact-checks sources and flags problems. You write everything.',
    aiMode: 'light',
    preserveLevel: 5,
    preserveAdjustable: false,
  },
  {
    stop: 2,
    label: 'My voice, AI helps',
    detail: 'AI suggests phrasing and structure around what you write.',
    aiMode: 'collab',
    preserveLevel: 4,
    preserveAdjustable: true,
  },
  {
    stop: 3,
    label: 'Co-author',
    detail: 'You and the AI alternate. Balanced collaboration.',
    aiMode: 'collab',
    preserveLevel: 3,
    preserveAdjustable: true,
  },
  {
    stop: 4,
    label: 'AI drafts from our meeting',
    detail: 'AI writes a full draft from the encounter. You edit.',
    aiMode: 'heavy',
    preserveLevel: 1,
    preserveAdjustable: false,
  },
];

export function descriptorFor(stop: VoiceStop): VoiceDescriptor {
  return VOICE_STOPS.find((s) => s.stop === stop) || VOICE_STOPS[1];
}

/**
 * Translate the voice slider + optional preserve override into the
 * request fields the backend already understands.
 */
export function toGenerateParams(stop: VoiceStop, preserveOverride?: number): {
  aiMode: AiMode;
  preserveLevel: number;
} {
  const d = descriptorFor(stop);
  return {
    aiMode: d.aiMode,
    preserveLevel: d.preserveAdjustable && preserveOverride != null
      ? preserveOverride
      : d.preserveLevel,
  };
}
