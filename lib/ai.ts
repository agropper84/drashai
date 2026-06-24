import Anthropic from '@anthropic-ai/sdk';
import { getSessionFromCookies } from '@/lib/session';
import { getUserClaudeApiKey, getUserSettings } from '@/lib/kv';
import { MODELS, DEFAULT_AI_CONFIG, type AIConfig } from '@/lib/models';

export { MODELS } from '@/lib/models';

export async function getClient(): Promise<Anthropic> {
  // Prefer server env key (hardcoded for all users), fall back to user's personal key
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) return new Anthropic({ apiKey: envKey });

  const session = await getSessionFromCookies();
  if (session.userId) {
    const userKey = await getUserClaudeApiKey(session.userId).catch(() => null);
    if (userKey) return new Anthropic({ apiKey: userKey });
  }
  throw new Error('No Anthropic API key configured');
}

/** Load user's AI model + token preferences from settings. Falls back to defaults. */
export async function getUserAIConfig(): Promise<AIConfig> {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return DEFAULT_AI_CONFIG;
    const settings = await getUserSettings(session.userId);
    if (!settings) return DEFAULT_AI_CONFIG;
    return {
      model: (settings.aiModel as string) || DEFAULT_AI_CONFIG.model,
      maxTokens: (settings.aiMaxTokens as number) || DEFAULT_AI_CONFIG.maxTokens,
    };
  } catch {
    return DEFAULT_AI_CONFIG;
  }
}

/** Simple non-streaming helper. Returns the text content of a single message. */
export async function askClaude(
  prompt: string,
  opts?: { maxTokens?: number; model?: string },
): Promise<string> {
  const client = await getClient();
  const config = await getUserAIConfig();
  const msg = await client.messages.create({
    model: opts?.model || config.model,
    max_tokens: opts?.maxTokens || config.maxTokens,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}
