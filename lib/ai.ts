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

/** Simple non-streaming helper. Returns the text content of a single message. */
export async function askClaude(
  prompt: string,
  opts?: { maxTokens?: number; model?: string },
): Promise<string> {
  const client = await getClient();
  const msg = await client.messages.create({
    model: opts?.model || MODELS.SONNET,
    max_tokens: opts?.maxTokens || 4096,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = msg.content[0];
  return block.type === 'text' ? block.text : '';
}
