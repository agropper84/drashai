/**
 * Initialize Google Drive folder structure for the current user.
 * Called on first use or to verify Drive is connected.
 */

import { NextResponse } from 'next/server';
import { getDriveContext } from '@/lib/drive-storage';

export async function POST() {
  try {
    const ctx = await getDriveContext();
    return NextResponse.json({
      ok: true,
      rootFolderId: ctx.rootFolderId,
      subfolders: ctx.subfolderIds,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const ctx = await getDriveContext();
    return NextResponse.json({
      connected: true,
      rootFolderId: ctx.rootFolderId,
      subfolders: ctx.subfolderIds,
    });
  } catch (e: any) {
    return NextResponse.json({ connected: false, error: e.message });
  }
}
