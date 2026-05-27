// GET /api/drive/download?fileId=xxx — Downloads a file from Google Drive
// and re-uploads it to Vercel Blob so it's accessible to the app.

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies, updateSession } from '@/lib/session';
import { refreshAccessToken } from '@/lib/oauth';
import { put } from '@vercel/blob';

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId || !session.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const fileId = req.nextUrl.searchParams.get('fileId');
    if (!fileId) return NextResponse.json({ error: 'fileId required' }, { status: 400 });

    // Refresh token if needed
    let token = session.accessToken;
    if (session.tokenExpiry && Date.now() > session.tokenExpiry - 5 * 60 * 1000 && session.refreshToken) {
      try {
        const refreshed = await refreshAccessToken(session.refreshToken);
        token = refreshed.access_token!;
        await updateSession({ accessToken: token, tokenExpiry: refreshed.expiry_date || Date.now() + 3600 * 1000 });
      } catch {}
    }

    // Get file metadata
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!metaRes.ok) return NextResponse.json({ error: 'Failed to fetch file metadata' }, { status: 500 });
    const meta = await metaRes.json();

    // Download file content
    const dlRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!dlRes.ok) return NextResponse.json({ error: 'Failed to download file' }, { status: 500 });

    const buf = Buffer.from(await dlRes.arrayBuffer());

    // Upload to Vercel Blob
    const blob = await put(
      `rav-docs/${session.userId}/drive/${meta.name}`,
      buf,
      { access: 'public', addRandomSuffix: true, contentType: meta.mimeType },
    );

    return NextResponse.json({
      url: blob.url,
      name: meta.name,
      size: meta.size ? parseInt(meta.size) : buf.length,
      type: meta.mimeType,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
