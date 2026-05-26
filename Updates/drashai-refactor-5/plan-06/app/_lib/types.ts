// Plan 6 — Spark gets server-side timestamps.
// Everything else identical to Plan 5.

export type FileTab = 'conversation' | 'documents' | 'sources' | 'insights' | 'draft' | 'final';
export type CardView = 'detailed' | 'minimal';

export interface EncounterSource {
  ref: string; heRef?: string; he: string; en: string; note?: string; addedAt: string;
}
export interface GeneratedContent { type: string; content: string; generatedAt: string; }
export interface Moment { t: number; label?: string; createdAt: string; }
export interface Task {
  id: string; body: string; done: boolean; due?: string | null; createdAt: string;
}

export interface Encounter {
  id: string;
  congregantName: string;
  subject?: string;
  subjectHeb?: string;
  date: string;
  topic?: string;
  type?: string;
  typeHeb?: string;
  status?: string;
  workflowId?: string;
  phase?: string;
  completedPhases?: string[];
  nextEvent?: string;
  nextEventRel?: string;
  sealed?: boolean;
  archivedAt?: string;
  transcript: string;
  notes: string;
  sources?: EncounterSource[];
  generatedContent?: GeneratedContent[];
  moments?: Moment[];
  tasks?: Task[];
  createdAt: string;
  updatedAt: string;
}

export interface Spark {
  id: string;
  body: string;
  /** A short label like 'Voice Note', 'Insight', 'Link'. Free-form. */
  tag?: string;
  /** Coarse category — Plan 6 auto-assigns via /api/sparks/classify. */
  category?: string;
  /** Display-friendly date. */
  when: string;
  url?: string;
  /** When set, this spark is an insight scoped to a specific file. */
  fileId?: string;
  /** Plan 9 — recording moment marker. */
  momentT?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateStyleDoc { name: string; url: string; excerpt?: string; }
export interface Template {
  id: string; heb: string; en: string; sections: string; desc: string;
  prompt: string; builtIn?: boolean; fullBody?: string;
  styleDocuments?: TemplateStyleDoc[]; variables?: string[];
}

export interface Workflow {
  id: string; name: string; heb: string; templateId: string;
  phases: string[]; defaultView: CardView; showSpine: boolean;
  autoSeal: boolean; builtIn?: boolean;
  phaseTabMap?: Partial<Record<string, FileTab>>;
}

export interface LibraryResult { ref: string; heRef: string; he: string; en: string; categories: string[]; }
export interface SavedSource { ref: string; he: string; en: string; savedAt: string; url?: string; type?: string; folder?: string; }
export interface SuggestedSearch { label: string; q: string; }
