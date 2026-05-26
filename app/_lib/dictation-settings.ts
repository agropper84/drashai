'use client';
// Dictation settings — stored in localStorage, persists across sessions.
// Adapted from MedScribe's profile/dictionary/processing system for
// rabbinical dictation.

const STORAGE_KEY = 'drashai.dictation';

export interface DictationSettings {
  /** Custom keyterms sent to STT for accuracy boost. */
  dictionary: string[];
  /** Refinement prompt sent to Claude after transcription. */
  refinePrompt: string;
  /** Whether Claude refinement is enabled. */
  refineEnabled: boolean;
  /** Convert spoken punctuation ("period" → "."). */
  convertSpokenPunctuation: boolean;
  /** Remove filler words ("um", "uh", "like"). */
  removeFillerWords: boolean;
  /** Custom filler words list. */
  fillerWords: string[];
  /** Insert mode: 'replace' overwrites composer, 'append' adds at cursor. */
  insertMode: 'replace' | 'append';
}

export const DEFAULT_RABBINICAL_DICTIONARY: string[] = [
  // Torah & Texts
  'Torah', 'Talmud', 'Mishnah', 'Gemara', 'Midrash', 'Tanakh',
  'Shulchan Aruch', 'Mishneh Torah', 'Zohar', 'Pirkei Avot',
  'Bereishit', 'Shemot', 'Vayikra', 'Bamidbar', 'Devarim',
  'Tehillim', 'Mishlei', 'Kohelet', 'Shir HaShirim', 'Eicha',
  // Scholars
  'Rashi', 'Tosafot', 'Rambam', 'Ramban', 'Ibn Ezra',
  'Maharsha', 'Maharal', 'Vilna Gaon', 'Baal Shem Tov',
  'Rav Kook', 'Rav Soloveitchik', 'Rav Heschel',
  // Halachic terms
  'halacha', 'minhag', 'psak', 'teshuvah', 'responsa',
  'mutar', 'assur', 'chayav', 'patur', 'safek',
  'lechatchila', 'bedieved', 'miderabanan', 'mideoraita',
  // Hermeneutics
  'kal vachomer', 'gezera shava', 'binyan av', 'hekesh',
  'klal uprat', 'davar halamed me\'inyano',
  // Liturgical
  'Shabbat', 'Yom Tov', 'Rosh Hashanah', 'Yom Kippur',
  'Sukkot', 'Pesach', 'Shavuot', 'Chanukah', 'Purim',
  'davening', 'tefillah', 'bracha', 'kiddush', 'havdalah',
  'Shema', 'Amidah', 'Kaddish', 'Aleinu',
  // Lifecycle
  'bar mitzvah', 'bat mitzvah', 'brit milah', 'pidyon haben',
  'shiva', 'hesped', 'kever', 'matzeivah', 'yahrzeit',
  'chuppah', 'ketubah', 'kiddushin', 'sheva brachot',
  // Concepts
  'chesed', 'tikkun olam', 'teshuva', 'emunah', 'bitachon',
  'kavana', 'kedusha', 'middot', 'mussar', 'hashgacha',
  'neshama', 'ruach', 'nefesh', 'olam haba', 'gan eden',
  // Structural
  'parsha', 'parashah', 'haftarah', 'aliyah', 'perek', 'pasuk',
  'sugya', 'daf', 'amud', 'masechet', 'seder',
  'Bavli', 'Yerushalmi', 'Tosefta', 'Sifra', 'Sifrei',
  // People categories
  'tanna', 'amora', 'rishon', 'acharon', 'posek', 'gadol',
  'kohen', 'levi', 'yisrael', 'ger', 'nochri',
];

export const DEFAULT_REFINE_PROMPT = `You are refining voice-dictated rabbinical text. Rules:
- Preserve all Hebrew and Aramaic terms exactly as spoken
- Capitalize proper names of texts (Torah, Talmud, Mishnah, Gemara, Midrash, Shulchan Aruch)
- Use standard scholarly transliteration (Rambam, not "ram bam")
- Fix speech-to-text errors for religious terminology
- Maintain formal rabbinical register and pastoral tone
- Preserve verse references (e.g. "Bereishit 18:6", "Tehillim 23")
- Correct grammar and punctuation while preserving the speaker's voice
- Do NOT add or remove content — only clean up the transcription
- Output ONLY the refined text, nothing else
- If no meaningful content is detected, output: EMPTY`;

export const DEFAULT_FILLER_WORDS = [
  'um', 'umm', 'uh', 'uhh', 'ah', 'ahh', 'er', 'err',
  'like', 'you know', 'I mean', 'so basically',
  'sort of', 'kind of', 'actually', 'literally',
];

const SPOKEN_PUNCTUATION: [RegExp, string][] = [
  [/\bperiod new paragraph\b/gi, '.\n\n'],
  [/\bnew paragraph\b/gi, '\n\n'],
  [/\bnew line\b/gi, '\n'],
  [/\bperiod\b/gi, '.'],
  [/\bcomma\b/gi, ','],
  [/\bquestion mark\b/gi, '?'],
  [/\bexclamation (?:mark|point)\b/gi, '!'],
  [/\bsemicolon\b/gi, ';'],
  [/\bcolon\b/gi, ':'],
  [/\bdash\b/gi, ' — '],
  [/\bhyphen\b/gi, '-'],
  [/\bellipsis\b/gi, '…'],
  [/\bopen (?:paren(?:thesis)?|bracket)\b/gi, ' ('],
  [/\bclose (?:paren(?:thesis)?|bracket)\b/gi, ') '],
  [/\bopen quote\b/gi, ' "'],
  [/\bclose quote\b/gi, '" '],
];

export function getDefaultSettings(): DictationSettings {
  return {
    dictionary: [...DEFAULT_RABBINICAL_DICTIONARY],
    refinePrompt: DEFAULT_REFINE_PROMPT,
    refineEnabled: true,
    convertSpokenPunctuation: true,
    removeFillerWords: true,
    fillerWords: [...DEFAULT_FILLER_WORDS],
    insertMode: 'append',
  };
}

export function loadDictationSettings(): DictationSettings {
  if (typeof window === 'undefined') return getDefaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSettings();
    return { ...getDefaultSettings(), ...JSON.parse(raw) };
  } catch {
    return getDefaultSettings();
  }
}

export function saveDictationSettings(s: DictationSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/** Apply spoken punctuation conversion to text. */
export function convertPunctuation(text: string): string {
  let out = text;
  for (const [rx, rep] of SPOKEN_PUNCTUATION) {
    out = out.replace(rx, rep);
  }
  // Auto-capitalize after sentence-enders
  out = out.replace(/([.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
  // Clean double spaces
  out = out.replace(/ {2,}/g, ' ');
  return out.trim();
}

/** Remove filler words from text. */
export function removeFillers(text: string, fillers: string[]): string {
  let out = text;
  for (const f of fillers) {
    const rx = new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b,?\\s*`, 'gi');
    out = out.replace(rx, '');
  }
  return out.replace(/ {2,}/g, ' ').trim();
}
