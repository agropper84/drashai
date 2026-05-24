import Anthropic from '@anthropic-ai/sdk';
import { getSessionFromCookies } from '@/lib/session';
import { getUserClaudeApiKey } from '@/lib/kv';

export const MODELS = {
  SONNET: 'claude-sonnet-4-6',
  HAIKU: 'claude-haiku-4-5-20251001',
} as const;

export async function getClient(): Promise<Anthropic> {
  const session = await getSessionFromCookies();
  if (session.userId) {
    const userKey = await getUserClaudeApiKey(session.userId).catch(() => null);
    if (userKey) return new Anthropic({ apiKey: userKey });
  }
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (!envKey) throw new Error('No Anthropic API key configured');
  return new Anthropic({ apiKey: envKey });
}
