'use client';
// Client wrapper that mounts every shared provider exactly once.
// The old App component had to mount these via useState — this lifts them to a single layer.

import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { EncountersProvider } from '@/app/_lib/encounters-store';
import { TemplatesProvider } from '@/app/_lib/templates-store';
import { SparksProvider } from '@/app/_lib/sparks-store';
import { LibraryProvider } from '@/app/_lib/library-store';
import { ModalProvider } from './modals/ModalProvider';
import { useTheme } from '@/app/_lib/theme';

export function AppShell({ userName, children }: { userName: string; children: ReactNode }) {
  // useTheme syncs data-theme + data-mode on <html> on every change
  useTheme();

  return (
    <EncountersProvider>
      <TemplatesProvider>
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
      </TemplatesProvider>
    </EncountersProvider>
  );
}
