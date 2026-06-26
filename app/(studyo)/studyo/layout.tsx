import { redirect } from 'next/navigation';
import { getSessionFromCookies } from '@/lib/session';
import { StudyoShell } from '@/app/(studyo)/_components/StudyoShell';
import '../studyo-enhancements.css';

export default async function StudyoLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionFromCookies();
  if (!session.userId) redirect('/login');

  return (
    <StudyoShell userName={session.name || ''}>
      {children}
    </StudyoShell>
  );
}
