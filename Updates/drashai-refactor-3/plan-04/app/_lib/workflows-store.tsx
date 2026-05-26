'use client';
// Plan 4 — built-in workflows gain phaseTabMap so each phase routes
// to a tab when clicked on the spine.

import { createContext, ReactNode, useContext, useState } from 'react';
import type { Workflow } from './types';

export const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'wf_eulogy', name: 'Eulogy preparation', heb: 'הכנת הספד',
    templateId: 'hesped',
    phases: ['Meet family', 'Record stories', 'Find sources', 'Draft hesped', 'Deliver'],
    phaseTabMap: {
      'Meet family':    'conversation',
      'Record stories': 'conversation',
      'Find sources':   'sources',
      'Draft hesped':   'draft',
      'Deliver':        'final',
    },
    defaultView: 'detailed', showSpine: true, autoSeal: true, builtIn: true,
  },
  {
    id: 'wf_sermon', name: 'Weekly sermon', heb: 'דרשה שבועית',
    templateId: 'drasha',
    phases: ['Read parashah', 'Capture sparks', 'Find sources', 'Draft', 'Deliver'],
    phaseTabMap: {
      'Read parashah':  'documents',
      'Capture sparks': 'insights',
      'Find sources':   'sources',
      'Draft':          'draft',
      'Deliver':        'final',
    },
    defaultView: 'minimal', showSpine: false, autoSeal: false, builtIn: true,
  },
  {
    id: 'wf_wedding', name: 'Wedding remarks', heb: 'דברי חופה',
    templateId: 'wedding',
    phases: ['Meet couple', 'Capture story', 'Sources', 'Draft', 'Chuppah'],
    phaseTabMap: {
      'Meet couple':   'conversation',
      'Capture story': 'conversation',
      'Sources':       'sources',
      'Draft':         'draft',
      'Chuppah':       'final',
    },
    defaultView: 'detailed', showSpine: true, autoSeal: true, builtIn: true,
  },
  {
    id: 'wf_bm', name: 'Bar/Bat Mitzvah', heb: 'בר/בת מצוה',
    templateId: 'bar_mitzvah',
    phases: ['Meet student', 'Their parashah', 'Personal blessing', 'Draft', 'Deliver'],
    phaseTabMap: {
      'Meet student':      'conversation',
      'Their parashah':    'documents',
      'Personal blessing': 'insights',
      'Draft':             'draft',
      'Deliver':           'final',
    },
    defaultView: 'detailed', showSpine: true, autoSeal: false, builtIn: true,
  },
  {
    id: 'wf_letter', name: 'Pastoral letter', heb: 'מכתב ניחומים',
    templateId: 'letter',
    phases: ['Pastoral visit', 'Sources', 'Draft', 'Sign & send'],
    phaseTabMap: {
      'Pastoral visit': 'conversation',
      'Sources':        'sources',
      'Draft':          'draft',
      'Sign & send':    'final',
    },
    defaultView: 'minimal', showSpine: false, autoSeal: true, builtIn: true,
  },
];

interface WorkflowsStore {
  workflows: Workflow[];
  setWorkflows: React.Dispatch<React.SetStateAction<Workflow[]>>;
  getById: (id?: string) => Workflow | undefined;
  getByTemplate: (templateId?: string) => Workflow | undefined;
}

const Ctx = createContext<WorkflowsStore | null>(null);

export function WorkflowsProvider({ children }: { children: ReactNode }) {
  const [workflows, setWorkflows] = useState<Workflow[]>(DEFAULT_WORKFLOWS);
  const getById = (id?: string) => workflows.find((w) => w.id === id);
  const getByTemplate = (templateId?: string) => workflows.find((w) => w.templateId === templateId);
  return (
    <Ctx.Provider value={{ workflows, setWorkflows, getById, getByTemplate }}>
      {children}
    </Ctx.Provider>
  );
}

export function useWorkflows() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkflows must be used inside <WorkflowsProvider>');
  return ctx;
}
