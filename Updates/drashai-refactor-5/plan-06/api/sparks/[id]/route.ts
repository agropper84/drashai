// Plan 6 — PATCH (partial update) + DELETE.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { kv } from '@/lib/kv';
import type { Spark } from '@/app/_lib/types';

const indexKey = (uid: string) => `sparks:${uid}`;
const sparkKey = (uid: string, id: string) => `sparks:${uid}:${id}`;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const existing = await kv.get<Spark>(sparkKey(session.userId, id));
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const updates: Partial<Spark> = {};

  // Direct field updates
  for (const k of ['body', 'tag', 'category', 'url', 'when'] as const) {
    if (body[k] !== undefined) updates[k] = body[k] as string;
  }
  // fileId — explicitly null clears it
  if ('fileId' in body) updates.fileId = body.fileId === null ? undefined : (body.fileId as string);

  // Convenience verbs
  if (body.assignTo !== undefined) {
    updates.fileId = body.assignTo === null ? undefined : (body.assignTo as string);
  }
  if (body.clearFile === true) updates.fileId = undefined;

  const next: Spark = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await kv.set(sparkKey(session.userId, id), next);
  return NextResponse.json({ spark: next });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  await kv.del(sparkKey(session.userId, id));
  const ids = (await kv.get<string[]>(indexKey(session.userId))) || [];
  await kv.set(indexKey(session.userId), ids.filter((x) => x !== id));

  return new NextResponse(null, { status: 204 });
}
