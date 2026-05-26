/**
 * Serve decrypted media (audio/documents) from Google Drive.
 * Downloads encrypted binary from Drive, decrypts server-side, streams to client.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDriveContext, downloadDecryptedBinary } from '@/lib/drive-storage';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const ctx = await getDriveContext();
    const buffer = await downloadDecryptedBinary(ctx, id);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (e: any) {
    if (e.message === 'Media not found') return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
