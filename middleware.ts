import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';

interface SessionData {
  userId: string;
  email: string;
  approved: boolean;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET || 'fallback-dev-secret-must-be-32-chars!!',
  cookieName: 'drashai-session',
};

const PUBLIC_PATHS = ['/login', '/api/auth'];
const PUBLIC_PREFIXES = ['/_next', '/icons', '/favicon'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip public paths
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return NextResponse.next();
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return NextResponse.next();

  // Check session
  try {
    const response = NextResponse.next();
    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    if (!session.userId) {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return response;
  } catch {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
