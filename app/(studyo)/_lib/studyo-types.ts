// Studyo data model — matches DATA_MODEL.md exactly.

export interface StudyoProject {
  id: string;
  title: string;
  desc: string;
  color: string;
  updatedAt: string;
  material: StudyoMaterial[];
  instructions: StudyoInstruction[];
  outputs: StudyoOutput[];
}

export interface StudyoMaterial {
  id: string;
  type: 'pdf' | 'text' | 'link' | 'media';
  title: string;
  meta: string;
  extractedText?: string;
  sourceUrl?: string;
}

export type OutputFormat = 'podcast' | 'lecture' | 'interview' | 'socratic' | 'summary' | 'custom';
export type OutputLength = 'quick' | 'standard' | 'deep';

export interface StudyoInstruction {
  id: string;
  name: string;
  format: OutputFormat;
  length: OutputLength;
  voiceA: string;
  voiceB: string | null;
  note: string;
}

export type OutputKind = 'audio' | 'transcript' | 'notes' | 'questions';

export interface TranscriptLine {
  t: number;
  who: string;
  text: string;
}

export interface NoteSection {
  h: string;
  items: string[];
}

export interface QuestionItem {
  q: string;
  a: string;
}

export interface StudyoOutput {
  id: string;
  kind: OutputKind;
  format: string;
  color: string;
  title: string;
  dur: string;
  pct: number;
  status: string;
  audioUrl?: string;
  transcript?: TranscriptLine[];
  notes?: NoteSection[];
  questions?: QuestionItem[];
  config?: Record<string, unknown>;
}

export type VoiceCategory = 'narration' | 'conversation' | 'character';

export interface StudyoVoice {
  id: string;
  name: string;
  desc: string;
  initials: string;
  color: string;
  category: VoiceCategory;
  tags: string[];
  best: string;
  custom: boolean;
  elevenVoiceId?: string;
}
