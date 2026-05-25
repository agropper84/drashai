// Plan 2 updates: adds Task, Workflow; extends Encounter with tasks,
// completedPhases, workflowId, nextEvent. Re-export-compatible with Plan 1.

export interface EncounterSource {
  ref: string;
  heRef?: string;
  he: string;
  en: string;
  note?: string;
  addedAt: string;
}

export interface GeneratedContent {
  type: string;
  content: string;
  generatedAt: string;
}

export interface Moment {
  t: number;
  label?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  body: string;
  done: boolean;
  due?: string | null;
  createdAt: string;
}

export interface Encounter {
  id: string;
  congregantName: string;
  /** Plan 2 — leads the card. e.g. "Miriam Goldberg z\"l" (vs congregantName = "Goldberg family"). */
  subject?: string;
  subjectHeb?: string;
  date: string;
  topic?: string;
  type?: string;
  typeHeb?: string;
  status?: string;
  /** Plan 4 — the workflow this file follows. */
  workflowId?: string;
  /** Plan 4 — current phase. Auto-detected, but the user can override. */
  phase?: string;
  /** Plan 2 — phases the user has manually marked complete. */
  completedPhases?: string[];
  /** Plan 2 — "Funeral · Thursday" — what's coming next. */
  nextEvent?: string;
  nextEventRel?: string;
  sealed?: boolean;
  archivedAt?: string;
  transcript: string;
  notes: string;
  sources?: EncounterSource[];
  generatedContent?: GeneratedContent[];
  moments?: Moment[];
  /** Plan 2 — tasks attached to this file. Surfaced in the task rail. */
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Spark {
  id: string;
  body: string;
  tag: string;
  category?: string;
  when: string;
  url?: string;
  fileId?: string;
  momentT?: number;
}

export interface TemplateStyleDoc {
  name: string;
  url: string;
  excerpt?: string;
}

export interface Template {
  id: string;
  heb: string;
  en: string;
  sections: string;
  desc: string;
  prompt: string;
  builtIn?: boolean;
  fullBody?: string;
  styleDocuments?: TemplateStyleDoc[];
  variables?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  /** Hebrew display name */
  heb: string;
  /** Which template this workflow pairs with (Template.id) */
  templateId: string;
  /** Ordered phase labels — first is the start state, last is "delivered". */
  phases: string[];
  /** Default view for cards using this workflow's template */
  defaultView: 'detailed' | 'minimal';
  showSpine: boolean;
  autoSeal: boolean;
  builtIn?: boolean;
}

export interface LibraryResult {
  ref: string;
  heRef: string;
  he: string;
  en: string;
  categories: string[];
}

export interface SavedSource {
  ref: string;
  he: string;
  en: string;
  savedAt: string;
  url?: string;
  type?: string;
  folder?: string;
}

export interface SuggestedSearch {
  label: string;
  q: string;
}

export type FileTab = 'conversation' | 'documents' | 'sources' | 'insights' | 'draft' | 'final';
export type CardView = 'detailed' | 'minimal';
