// Server component — runs BEFORE any client JS ships.
// If the user isn't signed in, redirect happens server-side (no login flash).
// Renders the client AppShell which holds providers + sidebar + main scroll container.

import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { AppShell } from '@/app/_components/AppShell';

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session.userId) redirect('/login');

  return (
    <AppShell userName={session.name || ''}>
      {children}
    </AppShell>
  );
}
