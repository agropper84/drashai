// GET /api/drive/picker-token — Returns the user's OAuth access token
// and the Google client ID so the client can open the Google Picker.

import { NextResponse } from 'next/server';
import { getSessionFromCookies, updateSession } from '@/lib/session';
import { refreshAccessToken } from '@/lib/oauth';

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session.userId || !session.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Refresh token if close to expiry (within 5 min)
    let token = session.accessToken;
    if (session.tokenExpiry && Date.now() > session.tokenExpiry - 5 * 60 * 1000) {
      if (session.refreshToken) {
        try {
          const refreshed = await refreshAccessToken(session.refreshToken);
          token = refreshed.access_token!;
          await updateSession({
            accessToken: token,
            tokenExpiry: refreshed.expiry_date || Date.now() + 3600 * 1000,
          });
        } catch {}
      }
    }

    return NextResponse.json({
      accessToken: token,
      clientId: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
