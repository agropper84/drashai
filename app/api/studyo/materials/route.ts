// POST /api/studyo/materials?projectId=xxx
// Handles all material types: paste (text), upload (PDF/doc), link, audio/video.
// Uploaded files are stored in the user's Google Drive under Studyo/uploads/ or Studyo/recordings/.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getProject, updateProject } from '@/lib/studyo-kv';
import { getStudyoDriveContext, uploadFile } from '@/lib/studyo-drive';
import type { StudyoMaterial } from '@/app/(studyo)/_lib/studyo-types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const projectId = req.nextUrl.searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

  const project = await getProject(session.userId, projectId);
  if (!project) return NextResponse.json({ error: 'project not found' }, { status: 404 });

  const contentType = req.headers.get('content-type') || '';

  let material: StudyoMaterial;

  if (contentType.includes('multipart/form-data')) {
    // File upload (PDF, doc, audio, video)
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const type = (form.get('type') as string) || 'pdf';
    const title = (form.get('title') as string) || file?.name || 'Uploaded file';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const isMedia = type === 'media' || /\.(mp3|wav|m4a|mp4|mov|webm|ogg)$/i.test(file.name);
    const subfolder = isMedia ? 'recordings' : 'uploads';

    // Upload to Google Drive
    let driveFileId: string | undefined;
    try {
      const ctx = await getStudyoDriveContext();
      driveFileId = await uploadFile(ctx, subfolder, `${project.title} — ${title}`, file.type || 'application/octet-stream', buffer);
    } catch (err) {
      console.error('[studyo/materials] Drive upload failed:', err);
      // Continue without Drive — store metadata anyway
    }

    material = {
      id: crypto.randomUUID(),
      type: isMedia ? 'media' : 'pdf',
      title,
      meta: isMedia
        ? `${file.type.split('/')[0]} · ${(buffer.length / 1024 / 1024).toFixed(1)} MB`
        : `${type.toUpperCase()} · ${Math.ceil(buffer.length / 1024)} KB`,
      sourceUrl: driveFileId ? `drive://${driveFileId}` : undefined,
    };
  } else {
    // JSON body (paste text or link)
    const body = await req.json();
    const { type, title, content, url } = body as {
      type: 'text' | 'link';
      title?: string;
      content?: string;
      url?: string;
    };

    if (type === 'text') {
      material = {
        id: crypto.randomUUID(),
        type: 'text',
        title: title || 'Pasted text',
        meta: `Pasted · ${(content || '').split(/\s+/).length.toLocaleString()} words`,
        extractedText: content,
      };
    } else if (type === 'link') {
      material = {
        id: crypto.randomUUID(),
        type: 'link',
        title: title || url || 'Link',
        meta: url || '',
        sourceUrl: url,
      };
    } else {
      return NextResponse.json({ error: 'Invalid material type' }, { status: 400 });
    }
  }

  // Add material to project
  const updated = await updateProject(session.userId, projectId, {
    material: [...project.material, material],
  });

  return NextResponse.json({ material, project: updated });
}
