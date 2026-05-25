'use client';
// Plan 2 — adds WorkflowsProvider (next to TemplatesProvider).
// Same as Plan 1 otherwise.

import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { EncountersProvider } from '@/app/_lib/encounters-store';
import { TemplatesProvider } from '@/app/_lib/templates-store';
import { WorkflowsProvider } from '@/app/_lib/workflows-store';
import { SparksProvider } from '@/app/_lib/sparks-store';
import { LibraryProvider } from '@/app/_lib/library-store';
import { ModalProvider } from './modals/ModalProvider';
import { useTheme } from '@/app/_lib/theme';

export function AppShell({ userName, children }: { userName: string; children: ReactNode }) {
  useTheme();

  return (
    <EncountersProvider>
      <TemplatesProvider>
        <WorkflowsProvider>
          <SparksProvider>
            <LibraryProvider>
              <ModalProvider>
                <div className="app">
                  <Sidebar userName={userName} />
                  <main className="main">
                    <div className="main-inner">{children}</div>
                  </main>
                </div>
              </ModalProvider>
            </LibraryProvider>
          </SparksProvider>
        </WorkflowsProvider>
      </TemplatesProvider>
    </EncountersProvider>
  );
}
