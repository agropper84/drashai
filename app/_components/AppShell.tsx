'use client';
// Plan 9 — RecordingProvider mounted at the shell so a recording session
// survives route navigation. RecordingBar renders globally and follows the user.

import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { EncountersProvider } from '@/app/_lib/encounters-store';
import { TemplatesProvider } from '@/app/_lib/templates-store';
import { WorkflowsProvider } from '@/app/_lib/workflows-store';
import { SparksProvider } from '@/app/_lib/sparks-store';
import { LibraryProvider } from '@/app/_lib/library-store';
import { ModalProvider } from './modals/ModalProvider';
import { RecordingProvider } from './recording/RecordingProvider';
import { RecordingBar } from './recording/RecordingBar';
import { SelectionMenu } from './SelectionMenu';
import { useTheme } from '@/app/_lib/theme';

export function AppShell({ userName, children }: { userName: string; children: ReactNode }) {
  useTheme();

  return (
    <EncountersProvider>
      <TemplatesProvider>
        <WorkflowsProvider>
          <SparksProvider>
            <LibraryProvider>
              <RecordingProvider>
                <ModalProvider>
                  <div className="app">
                    <Sidebar userName={userName} />
                    <main className="main">
                      <div className="main-inner">{children}</div>
                    </main>
                  </div>
                  <RecordingBar/>
                  <SelectionMenu/>
                </ModalProvider>
              </RecordingProvider>
            </LibraryProvider>
          </SparksProvider>
        </WorkflowsProvider>
      </TemplatesProvider>
    </EncountersProvider>
  );
}
