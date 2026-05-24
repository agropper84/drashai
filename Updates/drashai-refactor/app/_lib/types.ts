// Single source of truth for the app's data model.
// Extracted from inline interfaces in the old app/page.tsx.

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
  t: number;            // seconds from start of recording
  label?: string;
  createdAt: string;
}

export interface Encounter {
  id: string;
  congregantName: string;
  /** Reserved for Plan 2 — the subject (e.g. the deceased) vs the congregant met with. */
  subject?: string;
  subjectHeb?: string;
  date: string;
  topic?: string;
  type?: string;
  typeHeb?: string;
  status?: string;
  /** Reserved for Plan 4 — workflow status spine. */
  phase?: 'meeting' | 'recording' | 'sourcing' | 'drafting' | 'delivered';
  sealed?: boolean;
  /** Reserved for Plan 3 — soft delete. */
  archivedAt?: string;
  transcript: string;
  notes: string;
  sources?: EncounterSource[];
  generatedContent?: GeneratedContent[];
  /** Reserved for Plan 9 — recording moment markers. */
  moments?: Moment[];
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
  /** Reserved for Plan 6 — link spark to a file. */
  fileId?: string;
  /** Reserved for Plan 9 — link spark to a moment in a recording. */
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
  type?: string;       // 'upload' | 'url' | undefined (sefaria)
  folder?: string;
}

export interface SuggestedSearch {
  label: string;
  q: string;
}

export type FileTab = 'conversation' | 'documents' | 'sources' | 'insights' | 'draft' | 'final';
