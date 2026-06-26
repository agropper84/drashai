// GET  /api/studyo/voices — list curated + custom voices
// POST /api/studyo/voices — create custom voice (design or clone)

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getRedis } from '@/lib/kv';
import { CURATED_VOICES } from '@/app/(studyo)/_lib/studyo-voices';
import type { StudyoVoice } from '@/app/(studyo)/_lib/studyo-types';

const kvKey = (userId: string) => `studyo:${userId}:voices`;

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const redis = getRedis();
  const raw = await redis.get(kvKey(session.userId));
  const custom: StudyoVoice[] = raw ? JSON.parse(raw as string) : [];

  return NextResponse.json({
    voices: [...CURATED_VOICES, ...custom],
    custom,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const data = await req.json();
  const { name, desc, tags, category, color } = data as {
    name: string;
    desc: string;
    tags: string[];
    category: string;
    color: string;
  };

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const redis = getRedis();
  const raw = await redis.get(kvKey(session.userId));
  const custom: StudyoVoice[] = raw ? JSON.parse(raw as string) : [];

  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const voice: StudyoVoice = {
    id: `custom-${crypto.randomUUID().substring(0, 8)}`,
    name: name.trim(),
    desc: desc?.trim() || '',
    initials,
    color: color || '#D49A5A',
    category: (category as StudyoVoice['category']) || 'narration',
    tags: tags || [],
    best: 'Your custom voice',
    custom: true,
  };

  custom.push(voice);
  await redis.set(kvKey(session.userId), JSON.stringify(custom));

  return NextResponse.json({ voice });
}
