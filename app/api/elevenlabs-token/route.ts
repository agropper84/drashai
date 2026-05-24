/**
 * ElevenLabs single-use token for real-time WebSocket streaming
 */

import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getRedis } from '@/lib/kv';

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const apiKey = await getRedis().get(`user:${session.userId}:elevenlabs-key`)
      .catch(() => null) || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'ElevenLabs key not configured' }, { status: 400 });

    // Request single-use token for real-time scribe
    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text/get-websocket-token', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to get token' }, { status: 500 });
    }

    const data = await res.json();
    return NextResponse.json({ token: data.token });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
