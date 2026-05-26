# Plan 7 — Single AI Voice slider

The Draft tab currently has two overlapping controls: a Heavy/Collab/Light AI
mode toggle, and a 1-5 Preserve slider that only appears once the rabbi types.
Together they're cognitive load at the wrong moment — right when the rabbi is
trying to think about words, not knobs.

Plan 7 collapses both into a **single Voice slider** with four named stops.
Backend prompt logic stays just as capable; only the UI simplifies.

## What changes

- **One control on the Draft tab**: a slider with 4 stops:
  1. *Just check facts* — AI only fact-checks sources and finds problems
  2. *My voice, AI helps* — AI suggests phrasing and structure; rabbi writes
  3. *Co-author* — AI and rabbi alternate
  4. *AI drafts from our meeting* — AI writes from the encounter; rabbi edits
- Power controls (preserve fine-tune, freeform instructions, draft type picker)
  move under a **"More options"** disclosure that's collapsed by default.
- The backend continues to receive `voiceMode` (1-4) AND `preserveLevel` (1-5)
  and `aiMode` ('heavy' | 'collab' | 'light'). Mapping is computed on the client
  to keep the prompt logic 100% backward-compatible.

## Mapping (client computes, sends both to be safe)

| Voice slider stop | aiMode    | preserveLevel | Notes                                  |
|-------------------|-----------|---------------|----------------------------------------|
| 1 · Just facts    | light     | 5             | AI only fact-checks                    |
| 2 · My voice      | collab    | 4             | AI suggests around user's draft        |
| 3 · Co-author     | collab    | 3             | Balanced collaboration                 |
| 4 · AI drafts     | heavy     | 1             | AI writes; rabbi edits                 |

In **More options**, the user can independently adjust `preserveLevel` if their
voice slider is set to 2 or 3 (where the rabbi *is* writing). Stops 1 and 4
ignore manual preserve.

## Files in this patch

```
app/_lib/voice-mode.ts                    (NEW — mapping + descriptors)
app/_components/draft/VoiceSlider.tsx     (NEW — the slider control)
app/_components/draft/MoreOptions.tsx     (NEW — disclosure body)
app/(app)/files/[id]/draft/page.tsx       (UPDATED — replaces aside controls)
globals.plan-07.css                        (APPEND)
PATCH.md                                   (this file)
```

The Draft tab page (`draft/page.tsx`) is the big edit here. The composer and
streamed-content sections are unchanged.

## Backend changes

None required. The existing `/api/rav/generate` route already accepts
`aiMode` and `preserveLevel`. We just compute them differently client-side.

## Commit sequence

1. **Commit 1 — Mapping module**
   - `app/_lib/voice-mode.ts`
   - Pure functions, no UI, fully unit-testable.

2. **Commit 2 — Slider + disclosure components**
   - `app/_components/draft/VoiceSlider.tsx`
   - `app/_components/draft/MoreOptions.tsx`
   - Append `globals.plan-07.css` to `app/globals.css`.

3. **Commit 3 — Wire into Draft tab**
   - `app/(app)/files/[id]/draft/page.tsx`
   - Remove old AsidePanel controls; add VoiceSlider + MoreOptions.

## Done criteria

- [ ] Draft tab opens with ONE primary control visible (the slider)
- [ ] Stops 1 and 4 hide the preserve-level fine-tune in More options
- [ ] Stops 2 and 3 show the preserve fine-tune
- [ ] Generated content for each stop matches the old behavior of the
      corresponding aiMode + preserveLevel combination
- [ ] User preference for voice stop persists across sessions (localStorage)
