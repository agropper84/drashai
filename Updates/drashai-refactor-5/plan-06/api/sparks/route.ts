// Plan 6 — GET (list, optional fileId filter) + POST (create).
// Adapt the kv import to your existing lib/kv.ts shape.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { kv } from '@/lib/kv';
import type { Spark } from '@/app/_lib/types';

const indexKey = (uid: string) => `sparks:${uid}`;
const sparkKey = (uid: string, id: string) => `sparks:${uid}:${id}`;

async function listSparks(uid: string): Promise<Spark[]> {
  const ids = (await kv.get<string[]>(indexKey(uid))) || [];
  const sparks: Spark[] = [];
  for (const id of ids) {
    const s = await kv.get<Spark>(sparkKey(uid, id));
    if (s) sparks.push(s);
  }
  return sparks;
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const fileId = url.searchParams.get('fileId');

  const all = await listSparks(session.userId);
  let filtered = all;
  if (fileId === 'unassigned') filtered = all.filter((s) => !s.fileId);
  else if (fileId) filtered = all.filter((s) => s.fileId === fileId);

  return NextResponse.json({ sparks: filtered });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = (await req.json()) as Partial<Spark>;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const spark: Spark = {
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

  await kv.set(sparkKey(session.userId, id), spark);
  const ids = (await kv.get<string[]>(indexKey(session.userId))) || [];
  await kv.set(indexKey(session.userId), [id, ...ids]);

  return NextResponse.json({ spark });
}
