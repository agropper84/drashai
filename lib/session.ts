import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  userName?: string;
  userEmail?: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  approved: boolean;
  provider?: 'google' | 'microsoft'; // defaults to 'google' for existing sessions
  totpVerified?: boolean;
  lastActivityAt?: number;   // timestamp of last user activity (for session timeout)
  lastFullAuthAt?: number;   // timestamp of last full OAuth login (for 24h re-auth)
}

const sessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'drashai-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  },
};

export async function getSession(req: NextRequest): Promise<IronSession<SessionData>> {
  const res = new Response();
  const session = await getIronSession<SessionData>(req, res, sessionOptions);
  return session;
}

export async function getSessionFromCookies(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  return session;
}

export async function updateSession(updates: Partial<SessionData>): Promise<void> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  Object.assign(session, updates);
  await session.save();
}
