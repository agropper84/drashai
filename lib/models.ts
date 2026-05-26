/**
 * AI model constants — safe to import from client or server components.
 * Mirrors the pattern from hosp_workbook_vercel/lib/models.ts.
 */

/** Known Claude model presets. */
export const MODEL_PRESETS = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Recommended)' },
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 (Most Capable)' },
  { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fastest)' },
  { id: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5 (Legacy)' },
] as const;

/** Token limit presets. */
export const TOKEN_PRESETS = [
  { value: 2048, label: '2,048 (Short)' },
  { value: 4096, label: '4,096 (Standard)' },
  { value: 8192, label: '8,192 (Extended)' },
  { value: 16384, label: '16,384 (Maximum)' },
] as const;

export const MODELS = {
  /** Primary model for complex generation (sermons, eulogies, synthesis) */
  SONNET: 'claude-sonnet-4-6',
  /** Fast model for classification, decomposition, lightweight tasks */
  HAIKU: 'claude-haiku-4-5-20251001',
} as const;

export interface AIConfig {
  model: string;
  maxTokens: number;
}

export const DEFAULT_AI_CONFIG: AIConfig = {
  model: MODELS.SONNET,
  maxTokens: 4096,
};
