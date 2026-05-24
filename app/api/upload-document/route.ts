/**
 * Document upload to Vercel Blob
 * Supports PDFs, images, DOCX, text files
 */

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSessionFromCookies } from '@/lib/session';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const encounterId = formData.get('encounterId') as string || 'unlinked';

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const blob = await put(
      `rav-docs/${session.userId}/${encounterId}/${file.name}`,
      file,
      {
        access: 'public',
        addRandomSuffix: true,
      }
    );

    return NextResponse.json({
      url: blob.url,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (e: any) {
    console.error('[Upload Document] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
