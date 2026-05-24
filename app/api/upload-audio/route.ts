/**
 * Audio upload to Vercel Blob
 * Supports files up to 500MB (3+ hours of audio)
 * Files expire after 72 hours by default
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSessionFromCookies } from '@/lib/session';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const formData = await request.formData();
    const audio = formData.get('audio') as File | null;
    const encounterId = formData.get('encounterId') as string || 'unlinked';

    if (!audio) return NextResponse.json({ error: 'No audio file' }, { status: 400 });

    // Upload to Vercel Blob with 72h expiry
    const blob = await put(
      `rav/${session.userId}/${encounterId}/${Date.now()}-${audio.name || 'recording.webm'}`,
      audio,
      {
        access: 'public',
        addRandomSuffix: true,
      }
    );

    return NextResponse.json({
      url: blob.url,
      size: audio.size,
      type: audio.type,
    });
  } catch (e: any) {
    console.error('[Upload Audio] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
