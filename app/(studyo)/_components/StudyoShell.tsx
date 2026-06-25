'use client';

import type { ReactNode } from 'react';
import { StudyoSidebar } from './StudyoSidebar';
import { StudyoProvider } from '../_lib/studyo-store';

export function StudyoShell({ userName, children }: { userName: string; children: ReactNode }) {
  return (
    <StudyoProvider>
      <div className="sy-app" data-app="studyo">
        <StudyoSidebar userName={userName} />
        <main className="sy-main">
          <div className="sy-main-scroll">{children}</div>
        </main>
      </div>
    </StudyoProvider>
  );
}
