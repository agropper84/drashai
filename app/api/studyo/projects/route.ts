import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { listProjects, createProject } from '@/lib/studyo-kv';

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const projects = await listProjects(session.userId);
  return NextResponse.json({ projects });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = await req.json();
  const project = await createProject(session.userId, data);
  return NextResponse.json({ project });
}
