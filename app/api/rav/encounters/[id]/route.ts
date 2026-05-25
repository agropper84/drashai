import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getRedis } from '@/lib/kv';
import type { RavEncounter } from '../route';

const itemKey = (userId: string, id: string) => `rav:${userId}:encounter:${id}`;
const listKey = (userId: string) => `rav:${userId}:encounters`;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const data = await getRedis().get(itemKey(session.userId, id));
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ encounter: JSON.parse(data) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const redis = getRedis();
    const data = await redis.get(itemKey(session.userId, id));
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const encounter: RavEncounter = JSON.parse(data);
    const updates = await req.json();

    if (updates.congregantName !== undefined) encounter.congregantName = updates.congregantName;
    if (updates.date !== undefined) encounter.date = updates.date;
    if (updates.topic !== undefined) encounter.topic = updates.topic;
    if (updates.transcript !== undefined) encounter.transcript = updates.transcript;
    if (updates.notes !== undefined) encounter.notes = updates.notes;
    if (updates.appendTranscript) {
      encounter.transcript = encounter.transcript
        ? encounter.transcript + '\n\n' + updates.appendTranscript
        : updates.appendTranscript;
    }
    if (updates.addGenerated) {
      if (!encounter.generatedContent) encounter.generatedContent = [];
      encounter.generatedContent.push(updates.addGenerated);
    }
    if (updates.addSource) {
      if (!encounter.sources) encounter.sources = [];
      encounter.sources.push(updates.addSource);
    }
    if (updates.removeSourceRef) {
      encounter.sources = (encounter.sources || []).filter((s: any) => s.ref !== updates.removeSourceRef);
    }
    if (updates.sources !== undefined) encounter.sources = updates.sources;
    // Plan 2: tasks, phases, workflows
    if (updates.addTask) {
      if (!encounter.tasks) encounter.tasks = [];
      encounter.tasks.push({ id: crypto.randomUUID(), body: updates.addTask.body, done: false, due: updates.addTask.due || null, createdAt: new Date().toISOString() });
    }
    if (updates.toggleTask) {
      encounter.tasks = (encounter.tasks || []).map((t: any) => t.id === updates.toggleTask ? { ...t, done: !t.done } : t);
    }
    if (updates.removeTask) {
      encounter.tasks = (encounter.tasks || []).filter((t: any) => t.id !== updates.removeTask);
    }
    if (updates.togglePhase) {
      const completed = encounter.completedPhases || [];
      encounter.completedPhases = completed.includes(updates.togglePhase)
        ? completed.filter((p: string) => p !== updates.togglePhase)
        : [...completed, updates.togglePhase];
    }
    if (updates.workflowId !== undefined) encounter.workflowId = updates.workflowId;
    if (updates.phase !== undefined) encounter.phase = updates.phase;
    // Plan 3: archive/unarchive
    if (updates.archive === true) encounter.archivedAt = new Date().toISOString();
    if (updates.unarchive === true) { delete encounter.archivedAt; }
    encounter.updatedAt = new Date().toISOString();

    await redis.set(itemKey(session.userId, id), JSON.stringify(encounter));
    return NextResponse.json({ encounter });
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
    await redis.del(itemKey(session.userId, id));

    const listData = await redis.get(listKey(session.userId));
    const ids: string[] = listData ? JSON.parse(listData) : [];
    const filtered = ids.filter(i => i !== id);
    await redis.set(listKey(session.userId), JSON.stringify(filtered));

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
