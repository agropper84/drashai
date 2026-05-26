import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getRedis } from '@/lib/kv';
import { getDriveContext, writeEncryptedJson } from '@/lib/drive-storage';

const indexKey = (uid: string) => `sparks:${uid}`;
const sparkKey = (uid: string, id: string) => `sparks:${uid}:${id}`;

/** Rebuild sparks index on Drive from Redis source of truth */
async function syncSparksIndex(userId: string) {
  const redis = getRedis();
  const idsRaw = await redis.get(indexKey(userId));
  const ids: string[] = idsRaw ? JSON.parse(idsRaw) : [];
  const sparks: any[] = [];
  for (const sid of ids) {
    const raw = await redis.get(sparkKey(userId, sid));
    if (raw) try { sparks.push(JSON.parse(raw)); } catch {}
  }
  const ctx = await getDriveContext();
  await writeEncryptedJson(ctx, 'sparks', 'spark', '_index', { sparks });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const redis = getRedis();
    const raw = await redis.get(sparkKey(session.userId, id));
    if (!raw) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const existing = JSON.parse(raw);
    const body = await req.json();

    // Direct field updates
    for (const k of ['body', 'tag', 'category', 'url', 'when']) {
      if (body[k] !== undefined) existing[k] = body[k];
    }
    if ('fileId' in body) existing.fileId = body.fileId === null ? undefined : body.fileId;
    if (body.assignTo !== undefined) existing.fileId = body.assignTo === null ? undefined : body.assignTo;
    if (body.clearFile === true) existing.fileId = undefined;
    existing.updatedAt = new Date().toISOString();

    await redis.set(sparkKey(session.userId, id), JSON.stringify(existing));

    // Sync Drive spark index (fire-and-forget)
    syncSparksIndex(session.userId).catch(() => {});

    return NextResponse.json({ spark: existing });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const redis = getRedis();
    await redis.del(sparkKey(session.userId, id));
    const idsRaw = await redis.get(indexKey(session.userId));
    const ids: string[] = idsRaw ? JSON.parse(idsRaw) : [];
    await redis.set(indexKey(session.userId), JSON.stringify(ids.filter(x => x !== id)));

    // Sync Drive spark index (fire-and-forget)
    syncSparksIndex(session.userId).catch(() => {});

    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
