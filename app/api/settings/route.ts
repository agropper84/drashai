import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getRedis, setUserClaudeApiKey, setUserElevenLabsKey, getUserClaudeApiKey, getUserElevenLabsKey } from '@/lib/kv';

// Test Anthropic API key
async function testClaudeKey(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': key, 'content-type': 'application/json', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'hi' }] }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) return { ok: false, error: 'Invalid API key' };
    if (res.status === 403) return { ok: false, error: 'Key lacks permissions' };
    if (res.status === 429) return { ok: false, error: 'Rate limited — but key is valid' };
    if (data.error?.message?.includes('credit') || data.error?.message?.includes('balance')) return { ok: false, error: 'Insufficient credits' };
    return { ok: false, error: data.error?.message || `Error ${res.status}` };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// Test ElevenLabs API key
async function testElevenLabsKey(key: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': key },
    });
    if (res.ok) {
      const data = await res.json();
      const chars = data.subscription?.character_count || 0;
      const limit = data.subscription?.character_limit || 0;
      if (limit > 0 && chars >= limit) return { ok: false, error: `Character limit reached (${chars}/${limit})` };
      return { ok: true };
    }
    if (res.status === 401) return { ok: false, error: 'Invalid API key' };
    return { ok: false, error: `Error ${res.status}` };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// GET — fetch user settings with key validation status
export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const redis = getRedis();
    const settingsData = await redis.get(`user:${session.userId}:settings`);
    const settings = settingsData ? JSON.parse(settingsData) : {};

    // Check both API keys
    const claudeKey = await getUserClaudeApiKey(session.userId).catch(() => null);
    const elevenKey = await getUserElevenLabsKey(session.userId).catch(() => null);

    return NextResponse.json({
      ...settings,
      hasClaudeKey: !!claudeKey,
      hasElevenLabsKey: !!elevenKey,
      email: session.email,
      name: session.name,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — save user settings with key validation
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const redis = getRedis();
    const keyResults: Record<string, { ok: boolean; error?: string }> = {};

    // Handle Claude API key
    if (body.claudeApiKey !== undefined) {
      if (body.claudeApiKey) {
        const test = await testClaudeKey(body.claudeApiKey);
        keyResults.claude = test;
        if (test.ok || test.error?.includes('valid')) {
          await setUserClaudeApiKey(session.userId, body.claudeApiKey);
        }
      } else {
        await redis.del(`user:${session.userId}:claude-key`);
        keyResults.claude = { ok: false, error: 'Key removed' };
      }
      delete body.claudeApiKey;
    }

    // Handle ElevenLabs API key
    if (body.elevenlabsApiKey !== undefined) {
      if (body.elevenlabsApiKey) {
        const test = await testElevenLabsKey(body.elevenlabsApiKey);
        keyResults.elevenlabs = test;
        if (test.ok) {
          await setUserElevenLabsKey(session.userId, body.elevenlabsApiKey);
        }
      } else {
        await redis.del(`user:${session.userId}:elevenlabs-key`);
        keyResults.elevenlabs = { ok: false, error: 'Key removed' };
      }
      delete body.elevenlabsApiKey;
    }

    // Save other settings
    const existing = await redis.get(`user:${session.userId}:settings`);
    const current = existing ? JSON.parse(existing) : {};
    const merged = { ...current, ...body };
    await redis.set(`user:${session.userId}:settings`, JSON.stringify(merged));

    return NextResponse.json({ success: true, keyResults });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
