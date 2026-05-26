import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getRedis } from '@/lib/kv';

const indexKey = (uid: string) => `sparks:${uid}`;
const sparkKey = (uid: string, id: string) => `sparks:${uid}:${id}`;

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const redis = getRedis();
    const fileId = req.nextUrl.searchParams.get('fileId');
    const idsRaw = await redis.get(indexKey(session.userId));
    const ids: string[] = idsRaw ? JSON.parse(idsRaw) : [];

    if (ids.length === 0) return NextResponse.json({ sparks: [] });

    const pipeline = redis.pipeline();
    for (const id of ids) pipeline.get(sparkKey(session.userId, id));
    const results = await pipeline.exec();

    let sparks: any[] = [];
    for (const [err, val] of results || []) {
      if (!err && val) try { sparks.push(JSON.parse(val as string)); } catch {}
    }

    if (fileId === 'unassigned') sparks = sparks.filter(s => !s.fileId);
    else if (fileId) sparks = sparks.filter(s => s.fileId === fileId);

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

    return NextResponse.json({ spark });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
