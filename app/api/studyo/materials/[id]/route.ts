// DELETE /api/studyo/materials/:id?projectId=xxx
// Removes material from project and deletes file from Drive if applicable.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getProject, updateProject } from '@/lib/studyo-kv';
import { getStudyoDriveContext, deleteFile } from '@/lib/studyo-drive';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { id } = await params;
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const project = await getProject(session.userId, projectId);
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

  const material = project.material.find(m => m.id === id);

  // Delete from Drive if we have a Drive file reference
  if (material?.sourceUrl?.startsWith('drive://')) {
    try {
      const driveFileId = material.sourceUrl.replace('drive://', '');
      const ctx = await getStudyoDriveContext();
      await deleteFile(ctx, driveFileId);
    } catch (err) {
      console.error('[studyo/materials] Drive delete failed:', err);
    }
  }

  // Remove from project
  const updated = await updateProject(session.userId, projectId, {
    material: project.material.filter(m => m.id !== id),
  });

  return NextResponse.json({ ok: true, project: updated });
}
