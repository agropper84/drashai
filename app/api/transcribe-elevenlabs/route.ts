/**
 * ElevenLabs Scribe v2 Transcription
 * Supports encounter mode (diarization) and dictation mode
 * Audio stored in Vercel Blob for 3+ hour recordings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getUserElevenLabsKey } from '@/lib/kv';

export const maxDuration = 300; // 5 min timeout for large audio

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const formData = await request.formData();
    const audio = formData.get('audio') as File | null;
    const mode = (formData.get('mode') as string) || 'encounter';
    const language = (formData.get('language') as string) || 'auto';
    const noiseReduce = formData.get('noiseReduction') === 'true';

    if (!audio) return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });

    // Prefer server env key (hardcoded for all users), fall back to user's personal key
    const apiKey = process.env.ELEVENLABS_API_KEY || await getUserElevenLabsKey(session.userId).catch(() => null);
    if (!apiKey) return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 400 });

    // Build multipart form for ElevenLabs
    const boundary = `----formdata-${Date.now()}`;
    const audioBuffer = Buffer.from(await audio.arrayBuffer());

    let body = '';
    const addField = (name: string, value: string) => {
      body += `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`;
    };

    // Audio file part (will be appended as binary)
    const filePart = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${audio.name || 'recording.webm'}"\r\nContent-Type: ${audio.type || 'audio/webm'}\r\n\r\n`;

    addField('model_id', 'scribe_v2');
    // Language: omit for auto-detect (ElevenLabs detects if absent), otherwise send ISO code
    if (language && language !== 'auto') addField('language_code', language);
    // Noise reduction
    if (noiseReduce) addField('noise_reduction', 'true');

    // Diarization for encounter mode
    if (mode === 'encounter') {
      addField('diarize', 'true');
      addField('tag_audio_events', 'true');
    }

    // Build final body with binary audio
    const prefix = Buffer.from(body + filePart, 'utf-8');
    const suffix = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    const fullBody = Buffer.concat([prefix, audioBuffer, suffix]);

    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: fullBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Transcribe] ElevenLabs error:', res.status, errText);
      return NextResponse.json({ error: `Transcription failed (${res.status})` }, { status: 500 });
    }

    const result = await res.json();

    // Format transcript with speaker labels if diarized
    let transcript = result.text || '';
    if (mode === 'encounter' && result.words) {
      // Build speaker-tagged transcript from word-level diarization
      const words = result.words as { text: string; speaker_id?: string; start?: number }[];
      if (words.some(w => w.speaker_id)) {
        let currentSpeaker = '';
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const speaker = word.speaker_id || 'Unknown';
          if (speaker !== currentSpeaker) {
            if (currentLine.trim()) lines.push(`${currentSpeaker}: ${currentLine.trim()}`);
            currentSpeaker = speaker;
            currentLine = word.text;
          } else {
            currentLine += word.text;
          }
        }
        if (currentLine.trim()) lines.push(`${currentSpeaker}: ${currentLine.trim()}`);
        transcript = lines.join('\n');
      }
    }

    return NextResponse.json({
      text: transcript,
      language: result.language_code,
      duration: result.audio_duration,
    });
  } catch (e: any) {
    console.error('[Transcribe] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
