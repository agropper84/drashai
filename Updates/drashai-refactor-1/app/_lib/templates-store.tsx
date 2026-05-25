'use client';
// Templates store — built-in + user-defined. Used by New File modal, File detail header,
// Templates page, Sparks (for assign-to), Settings (prompt section is gone, replaced by templates).

import { createContext, ReactNode, useContext, useState } from 'react';
import type { Template } from './types';

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'hesped',
    heb: 'הספד',
    en: 'Eulogy (Hesped)',
    sections: 'Opening, Life story, Character, Torah, Closing',
    desc: 'A framework for honoring the departed',
    prompt: `Based on the encounter transcript with {{subject}}, create a eulogy that honors their life, incorporates personal stories shared by the family, includes relevant Torah references about loss and legacy, and balances grief with celebration of life. Structure: Opening acknowledgment → Life story and character → Torah wisdom → Closing blessing.`,
    builtIn: true,
    variables: ['transcript', 'notes', 'sparks'],
  },
  {
    id: 'drasha',
    heb: 'דרשה',
    en: 'Sermon (Drasha)',
    sections: 'Hook, Text, Teaching, Application, Call',
    desc: 'Shabbat or holiday sermon structure',
    prompt: `Based on the encounter transcript and notes, create a sermon that draws on themes from the conversation, connects to Torah/Talmud teachings, is accessible to a general congregation, and includes practical application. Structure: Hook → Torah text → Teaching/insight → Application to daily life → Call to action.`,
    builtIn: true,
  },
  {
    id: 'dvar_torah',
    heb: 'דבר תורה',
    en: "D'var Torah",
    sections: 'Text, Question, Insight, Connection',
    desc: 'Concise Torah teaching',
    prompt: `Based on the encounter and notes, create a concise D'var Torah that centers on a specific Torah portion, raises a question, offers a fresh insight, and connects to the themes discussed. Keep it focused and impactful (500-800 words).`,
    builtIn: true,
  },
  {
    id: 'bar_mitzvah',
    heb: 'בר/בת מצוה',
    en: 'Bar/Bat Mitzvah',
    sections: 'Welcome, Torah portion, Personal, Blessing',
    desc: 'Coming of age celebration',
    prompt: `Based on the encounter transcript with the family, create bar/bat mitzvah remarks that welcome the community, connect to the Torah portion, highlight personal qualities of the young person, and offer a meaningful blessing for their journey.`,
    builtIn: true,
  },
  {
    id: 'wedding',
    heb: 'נישואין',
    en: 'Wedding Remarks',
    sections: 'Couple story, Torah, Blessings, Charge',
    desc: 'Under the chuppah',
    prompt: `Based on the encounter transcript with the couple, create wedding remarks that tell their story, weave in Torah teachings about love and partnership, offer blessings, and charge them with building a Jewish home together.`,
    builtIn: true,
  },
  {
    id: 'letter',
    heb: 'מכתב',
    en: 'Pastoral Letter',
    sections: 'Greeting, Acknowledgment, Guidance, Blessing',
    desc: 'Condolence or pastoral care',
    prompt: `Based on the encounter transcript, create a pastoral letter that addresses the congregant by name, acknowledges their situation with empathy, offers relevant guidance or comfort from Jewish tradition, and closes with a blessing.`,
    builtIn: true,
  },
  {
    id: 'study',
    heb: 'לימוד',
    en: 'Study Notes',
    sections: 'Source, Analysis, Questions, Application',
    desc: 'Personal learning journal',
    prompt: `Based on the encounter and notes, create structured study notes that identify the key source texts discussed, analyze their meaning, raise questions for further exploration, and note practical applications.`,
    builtIn: true,
  },
];

interface TemplatesStore {
  templates: Template[];
  setTemplates: React.Dispatch<React.SetStateAction<Template[]>>;
  getById: (id?: string) => Template | undefined;
}

const Ctx = createContext<TemplatesStore | null>(null);

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const getById = (id?: string) => templates.find((t) => t.id === id);
  return (
    <Ctx.Provider value={{ templates, setTemplates, getById }}>{children}</Ctx.Provider>
  );
}

export function useTemplates() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTemplates must be used inside <TemplatesProvider>');
  return ctx;
}
