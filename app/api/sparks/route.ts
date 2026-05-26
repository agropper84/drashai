import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getRedis } from '@/lib/kv';
import { getDriveContext, writeEncryptedJson, readEncryptedJson } from '@/lib/drive-storage';

const indexKey = (uid: string) => `sparks:${uid}`;
const sparkKey = (uid: string, id: string) => `sparks:${uid}:${id}`;

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const fileId = req.nextUrl.searchParams.get('fileId');

    // Try Drive first
    let sparks: any[] = [];
    try {
      const ctx = await getDriveContext();
      const index = await readEncryptedJson<{ sparks: any[] }>(ctx, 'sparks', 'spark', '_index');
      if (index?.sparks?.length) sparks = index.sparks;
    } catch (e: any) {
      console.warn('[Sparks] Drive read failed, falling back to Redis:', e.message);
    }

    // Fall back to Redis if Drive empty
    if (sparks.length === 0) {
      const redis = getRedis();
      const idsRaw = await redis.get(indexKey(session.userId));
      const ids: string[] = idsRaw ? JSON.parse(idsRaw) : [];
      if (ids.length > 0) {
        const pipeline = redis.pipeline();
        for (const id of ids) pipeline.get(sparkKey(session.userId, id));
        const results = await pipeline.exec();
        for (const [err, val] of results || []) {
          if (!err && val) try { sparks.push(JSON.parse(val as string)); } catch {}
        }
        // Backfill to Drive
        if (sparks.length > 0) {
          getDriveContext().then(ctx =>
            writeEncryptedJson(ctx, 'sparks', 'spark', '_index', { sparks })
          ).catch(() => {});
        }
      }
    }

    if (fileId === 'unassigned') sparks = sparks.filter((s: any) => !s.fileId);
    else if (fileId) sparks = sparks.filter((s: any) => s.fileId === fileId);

    return NextResponse.json({ sparks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await req.json();
    const redis = getRedis();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const spark = {
      id,
      body: body.body || '',
      tag: body.tag,
      category: body.category,
      url: body.url,
      fileId: body.fileId,
      when: body.when || new Date().toLocaleDateString(),
      createdAt: now,
      updatedAt: now,
    };

    await redis.set(sparkKey(session.userId, id), JSON.stringify(spark));
    const idsRaw = await redis.get(indexKey(session.userId));
    const ids: string[] = idsRaw ? JSON.parse(idsRaw) : [];
    ids.unshift(id);
    await redis.set(indexKey(session.userId), JSON.stringify(ids));

    // Dual-write to Google Drive (fire-and-forget)
    getDriveContext().then(ctx =>
      writeEncryptedJson(ctx, 'sparks', 'spark', id, spark)
    ).catch(e => console.warn('[Drive] Spark write failed:', e.message));

    return NextResponse.json({ spark });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
