// GET /api/studyo/outputs/:id?projectId=xxx — fetch output details
// DELETE /api/studyo/outputs/:id?projectId=xxx — delete output and Drive files

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getProject, updateProject } from '@/lib/studyo-kv';
import { getStudyoDriveContext, deleteFile } from '@/lib/studyo-drive';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const project = await getProject(session.userId, projectId);
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

  const output = project.outputs.find(o => o.id === id);
  if (!output) return NextResponse.json({ error: 'output not found' }, { status: 404 });

  return NextResponse.json({ output });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const project = await getProject(session.userId, projectId);
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

  const output = project.outputs.find(o => o.id === id);

  // Delete associated Drive files (audio, transcript, etc.)
  if (output?.audioUrl?.startsWith('drive://')) {
    try {
      const ctx = await getStudyoDriveContext();
      await deleteFile(ctx, output.audioUrl.replace('drive://', ''));
    } catch (err) {
      console.error('[studyo/outputs] Drive delete failed:', err);
    }
  }

  const updated = await updateProject(session.userId, projectId, {
    outputs: project.outputs.filter(o => o.id !== id),
  });

  return NextResponse.json({ ok: true, project: updated });
}
