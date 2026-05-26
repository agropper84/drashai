import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getRedis } from '@/lib/kv';
import { getDriveContext, writeEncryptedJson, readEncryptedJson } from '@/lib/drive-storage';

export interface RavEncounter {
  id: string;
  congregantName: string;
  date: string;
  topic?: string;
  transcript: string;
  notes: string;
  generatedContent?: { type: string; content: string; generatedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

const listKey = (userId: string) => `rav:${userId}:encounters`;
const itemKey = (userId: string, id: string) => `rav:${userId}:encounter:${id}`;

// ── Helpers ──────────────────────────────────────────────────

/** Read encounter index from Drive, fall back to Redis */
async function listEncounters(userId: string): Promise<RavEncounter[]> {
  // Try Drive first
  try {
    const ctx = await getDriveContext();
    const index = await readEncryptedJson<{ encounters: RavEncounter[] }>(ctx, 'encounters', 'encounter', '_index');
    if (index?.encounters?.length) return index.encounters;
  } catch (e: any) {
    console.warn('[Encounters] Drive read failed, falling back to Redis:', e.message);
  }

  // Fall back to Redis
  const redis = getRedis();
  const listData = await redis.get(listKey(userId));
  const ids: string[] = listData ? JSON.parse(listData) : [];
  if (ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(itemKey(userId, id));
  const results = await pipeline.exec();

  const encounters: RavEncounter[] = [];
  for (const [err, val] of results || []) {
    if (!err && val) try { encounters.push(JSON.parse(val as string)); } catch {}
  }

  // Backfill to Drive (fire-and-forget)
  if (encounters.length > 0) {
    getDriveContext().then(async ctx => {
      for (const enc of encounters) {
        await writeEncryptedJson(ctx, 'encounters', 'encounter', enc.id, enc).catch(() => {});
      }
      await writeEncryptedJson(ctx, 'encounters', 'encounter', '_index', { encounters }).catch(() => {});
    }).catch(() => {});
  }

  return encounters;
}

/** Update the Drive index after any mutation */
async function updateDriveIndex(userId: string) {
  try {
    const redis = getRedis();
    const listData = await redis.get(listKey(userId));
    const ids: string[] = listData ? JSON.parse(listData) : [];
    const pipeline = redis.pipeline();
    for (const id of ids) pipeline.get(itemKey(userId, id));
    const results = await pipeline.exec();
    const encounters: RavEncounter[] = [];
    for (const [err, val] of results || []) {
      if (!err && val) try { encounters.push(JSON.parse(val as string)); } catch {}
    }
    const ctx = await getDriveContext();
    await writeEncryptedJson(ctx, 'encounters', 'encounter', '_index', { encounters });
  } catch {}
}

// ── GET ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true';

    const all = await listEncounters(session.userId);
    const filtered = includeArchived ? all : all.filter(e => !(e as any).archivedAt);
    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json({ encounters: filtered });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { congregantName, date, topic, type } = await req.json();
    if (!congregantName?.trim()) return NextResponse.json({ error: 'Congregant name is required' }, { status: 400 });

    const encounter: RavEncounter = {
      id: crypto.randomUUID(),
      congregantName: congregantName.trim(),
      date: date || new Date().toISOString().slice(0, 10),
      topic: topic?.trim() || undefined,
      transcript: '', notes: '', generatedContent: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    if (type) (encounter as any).type = type;

    // Write to Redis
    const redis = getRedis();
    await redis.set(itemKey(session.userId, encounter.id), JSON.stringify(encounter));
    const listData = await redis.get(listKey(session.userId));
    const ids: string[] = listData ? JSON.parse(listData) : [];
    ids.unshift(encounter.id);
    await redis.set(listKey(session.userId), JSON.stringify(ids));

    // Write to Drive + update index (fire-and-forget)
    getDriveContext().then(async ctx => {
      await writeEncryptedJson(ctx, 'encounters', 'encounter', encounter.id, encounter);
      updateDriveIndex(session.userId);
    }).catch(e => console.warn('[Drive] Encounter create failed:', e.message));

    return NextResponse.json({ encounter });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
