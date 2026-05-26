# Plan 10 — Voice training, Zen polish, inline translate, highlight-to-source

Final installment. Combines four streams:

**A. Voice training prominence** (from the original review, item #10).
Style documents move to the top of the Template editor with a "voice strength"
meter. Surfaces the killer feature.

**B. Zen mode polish.**
- `⌘.` keyboard shortcut to toggle.
- Per-user preference persisted to localStorage.
- Default ON for first-time opening of a draft (configurable in Settings).
- Smooth fade transition replaces the hard cut.

**C. Inline translate** (NEW — Hebrew ↔ English, side-by-side).
- A "Translate" toggle in the composer / final / conversation / library
  text views.
- Splits into two columns: original on one side, live translation on the other.
- Auto-detects source language; user can flip direction.
- Translation streams from Claude in real time (or static after first call,
  cached per-paragraph).

**D. Highlight-to-source** (NEW — select text, find sources, insert).
- Selecting any text anywhere shows a floating toolbar at the selection.
- "Search sources" → opens the SourcePicker pre-filled with the selection.
- Pick a source → choose "Attach" (saves to file) or "Insert" (replaces the
  selection with the inline source token in the composer).
- Works in Conversation, Draft, Final, Library, Insights — anywhere readable.

## Files in this patch

```
app/_lib/types.ts                                       (UPDATED — Template gets voiceStrength helper)
app/_lib/api.ts                                          (UPDATED — adds translate)
app/_lib/voice-training.ts                               (NEW — voice strength calc)
app/_lib/use-selection.ts                                (NEW — selection-aware hook)
app/_lib/zen-mode.ts                                     (NEW — shortcut + persistence)
app/_components/SelectionMenu.tsx                        (NEW — floating toolbar)
app/_components/translate/TranslatePanel.tsx             (NEW — side-by-side wrapper)
app/_components/translate/useTranslation.ts              (NEW — streaming wrapper)
app/_components/templates/VoiceTrainingSection.tsx       (NEW — promoted UI for style docs)
app/(app)/templates/page.tsx                             (UPDATED — Voice Training section moves to top)
app/(app)/settings/page.tsx                              (UPDATED — Zen default toggle in Appearance)
app/(app)/files/[id]/conversation/page.tsx               (UPDATED — translate toggle + selection menu)
app/(app)/files/[id]/draft/page.tsx                      (UPDATED — translate + selection)
app/(app)/files/[id]/final/page.tsx                      (UPDATED — translate + selection)
api/translate/route.ts                                   (NEW)
globals.plan-10.css                                      (APPEND)
PATCH.md                                                  (this file)
```

## Backend: `POST /api/translate`

Body: `{ text: string; direction?: 'he-en' | 'en-he' | 'auto' }`.
Returns a streaming text response (same pattern as `/api/rav/generate`).

The prompt should preserve:
- **Verse references intact** (e.g. `(Gen 18:6)` stays the same)
- **Niqqud** where present in Hebrew source
- **Paragraph breaks** — paragraph N in source maps to paragraph N in output
- **Proper names** — transliterate consistently (Yaakov, not Jacob, unless name is clearly anglicized in source)

## Voice-training strength

`voice-training.ts` exposes a pure function:

```ts
voiceStrength(template: Template): {
  level: 'none' | 'starter' | 'developing' | 'established' | 'rich';
  docCount: number;
  totalChars: number;
  hint: string;
}
```

Tiers:
| Level         | Doc count | Total chars  | Hint                                       |
|---------------|-----------|--------------|--------------------------------------------|
| none          | 0         | 0            | Add at least one sample of your writing    |
| starter       | 1-2       | < 2,000      | Two more samples will sharpen your voice   |
| developing    | 2-4       | 2k - 8k      | Halfway there                              |
| established   | 4-7       | 8k - 25k     | Strong voice signal                        |
| rich          | 8+        | > 25k        | Your voice is well-trained                 |

The bar/meter is purely informational; generation works at every level.

## Selection toolbar UX

- Selection ≥ 3 characters anywhere inside an element with `data-selectable="true"`
  triggers the toolbar.
- Toolbar is positioned just above the selection's bounding rect.
- Buttons (left to right):
  - **Find sources** (default action — Enter key while selection active)
  - **Translate this**
  - **Copy to Sparks**
- Clicking outside or pressing Escape dismisses.

## Zen mode shortcut

`⌘.` (Mac) / `Ctrl+.` (Win/Linux). Toggles the Draft tab's Zen layout.
Setting in `Settings → Appearance → "Open drafts in Zen mode by default"`
controls the initial state for newly opened drafts.

## Commit sequence

1. **Commit 1 — Voice training**
   - `app/_lib/voice-training.ts`
   - `app/_components/templates/VoiceTrainingSection.tsx`
   - `app/(app)/templates/page.tsx` (promotion — section moves to top of editor)

2. **Commit 2 — Zen mode polish**
   - `app/_lib/zen-mode.ts`
   - Update Draft tab to use `useZenMode` hook.
   - Add toggle in Settings → Appearance.

3. **Commit 3 — Translate backend + frontend**
   - `api/translate/route.ts`
   - `app/_lib/api.ts` (translate fn)
   - `app/_components/translate/useTranslation.ts`
   - `app/_components/translate/TranslatePanel.tsx`
   - Wire toggle into Conversation, Draft, Final tabs.

4. **Commit 4 — Selection-to-source**
   - `app/_lib/use-selection.ts`
   - `app/_components/SelectionMenu.tsx`
   - Mount the menu globally; add `data-selectable="true"` to text containers.

5. **Commit 5 — CSS**
   - Append `globals.plan-10.css` to `app/globals.css`.

## Done criteria

- [ ] Open a template in /templates — Voice Training is the first section in the editor with a visible strength bar
- [ ] Cmd/Ctrl + . toggles Zen mode anywhere on the Draft tab; preference persists
- [ ] Click Translate in Draft tab — left/right columns appear, translation streams in
- [ ] Select 3+ chars in a transcript — floating toolbar appears with Find sources / Translate this / Copy to Sparks
- [ ] "Find sources" with a selection auto-fills the picker; pick → Attach or Insert at the original selection
- [ ] All 4 features compose: select Hebrew text in a translated view → toolbar works on either column
