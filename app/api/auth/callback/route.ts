import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { exchangeCode, getGoogleUserInfo } from '@/lib/oauth';
import type { SessionData } from '@/lib/session';

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'drashai-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  },
};

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login?error=no_code', request.url));

  try {
    const tokens = await exchangeCode(code);
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    const response = NextResponse.redirect(new URL('/', request.url));
    const session = await getIronSession<SessionData>(request, response, sessionOptions);

    session.userId = userInfo.sub;
    session.email = userInfo.email;
    session.name = userInfo.name;
    session.accessToken = tokens.access_token;
    session.refreshToken = tokens.refresh_token;
    session.tokenExpiry = Date.now() + tokens.expires_in * 1000;
    session.approved = true;
    await session.save();

    return response;
  } catch (e: any) {
    console.error('[Auth Callback] Error:', e.message);
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
}
