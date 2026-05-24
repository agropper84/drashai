import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getRedis, setUserClaudeApiKey, setUserElevenLabsKey } from '@/lib/kv';

// GET — fetch user settings (including API key status)
export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const redis = getRedis();
    const settingsData = await redis.get(`user:${session.userId}:settings`);
    const settings = settingsData ? JSON.parse(settingsData) : {};

    // Check if API key exists (don't return the actual key)
    const claudeKey = await redis.get(`user:${session.userId}:claude-key`);

    return NextResponse.json({
      ...settings,
      hasClaudeKey: !!claudeKey,
      email: session.email,
      name: session.name,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — save user settings (including API key)
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const redis = getRedis();

    // Handle API keys separately (encrypted at rest)
    if (body.claudeApiKey !== undefined) {
      if (body.claudeApiKey) {
        await setUserClaudeApiKey(session.userId, body.claudeApiKey);
      } else {
        await redis.del(`user:${session.userId}:claude-key`);
      }
      delete body.claudeApiKey;
    }
    if (body.elevenlabsApiKey !== undefined) {
      if (body.elevenlabsApiKey) {
        await setUserElevenLabsKey(session.userId, body.elevenlabsApiKey);
      } else {
        await redis.del(`user:${session.userId}:elevenlabs-key`);
      }
      delete body.elevenlabsApiKey;
    }

    // Save other settings
    const existing = await redis.get(`user:${session.userId}:settings`);
    const current = existing ? JSON.parse(existing) : {};
    const merged = { ...current, ...body };
    await redis.set(`user:${session.userId}:settings`, JSON.stringify(merged));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
