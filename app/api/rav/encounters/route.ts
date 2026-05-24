import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getRedis } from '@/lib/kv';

export interface RavEncounter {
  id: string;
  congregantName: string;
  date: string;
  topic?: string;
  transcript: string;
  notes: string;
  generatedContent?: {
    type: string;
    content: string;
    generatedAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

const listKey = (userId: string) => `rav:${userId}:encounters`;
const itemKey = (userId: string, id: string) => `rav:${userId}:encounter:${id}`;

// GET — list all encounters for current user
export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const redis = getRedis();
    const listData = await redis.get(listKey(session.userId));
    const ids: string[] = listData ? JSON.parse(listData) : [];

    if (ids.length === 0) return NextResponse.json({ encounters: [] });

    const pipeline = redis.pipeline();
    for (const id of ids) pipeline.get(itemKey(session.userId, id));
    const results = await pipeline.exec();

    const encounters: RavEncounter[] = [];
    for (const [err, val] of results || []) {
      if (!err && val) {
        try { encounters.push(JSON.parse(val as string)); } catch {}
      }
    }

    // Sort newest first
    encounters.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return NextResponse.json({ encounters });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — create new encounter
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { congregantName, date, topic } = await req.json();
    if (!congregantName?.trim()) return NextResponse.json({ error: 'Congregant name is required' }, { status: 400 });

    const encounter: RavEncounter = {
      id: crypto.randomUUID(),
      congregantName: congregantName.trim(),
      date: date || new Date().toISOString().slice(0, 10),
      topic: topic?.trim() || undefined,
      transcript: '',
      notes: '',
      generatedContent: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const redis = getRedis();
    // Save encounter
    await redis.set(itemKey(session.userId, encounter.id), JSON.stringify(encounter));
    // Add to list
    const listData = await redis.get(listKey(session.userId));
    const ids: string[] = listData ? JSON.parse(listData) : [];
    ids.unshift(encounter.id);
    await redis.set(listKey(session.userId), JSON.stringify(ids));

    return NextResponse.json({ encounter });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
