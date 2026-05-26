# Plan 4 — Workflow status spine on the file detail

The status spine already lives on cards (Plan 2). Plan 4 brings it into the file
detail itself, makes it click-to-jump between tabs, and adds **auto-advance
heuristics** so the spine moves forward on its own as the rabbi works.

## What changes

- **Spine on the file detail header** — full-width, prominent, between the meta
  row and the tab bar. Click any phase to jump to the relevant tab.
- **Auto-advance** — based on observable state (transcript present, sources
  attached, a draft generated, marked delivered). User overrides win.
- **Mark Delivered** button in the file detail header — moves the file to the
  delivered phase and triggers the workflow's seal-on-delivery rule.
- **Per-phase → tab mapping** is configurable in the Workflow editor (Settings).

## Auto-advance rules

The rules sit in `app/_lib/phase-heuristics.ts`. The pure function takes an
encounter and a workflow and returns the *suggested* phase. The user's explicit
`completedPhases` and `phase` always override.

| Phase index in workflow | Auto-complete when… |
|---|---|
| 0 (e.g. "Meet") | File created — completed by default |
| 1 (e.g. "Record") | `transcript.length > 100` |
| 2 (e.g. "Source") | `(sources?.length ?? 0) > 0` |
| 3 (e.g. "Draft") | `(generatedContent?.length ?? 0) > 0` OR `userDraft.length > 50` |
| last (e.g. "Deliver") | User clicks "Mark Delivered" |

These are heuristics, not rules. Click any dot or label to override.

## Files in this patch

```
app/_lib/types.ts                                 (UPDATED — adds phaseTabMap to Workflow)
app/_lib/phase-heuristics.ts                      (NEW)
app/_lib/workflows-store.tsx                      (UPDATED — built-in workflows get phaseTabMap)
app/_components/StatusSpine.tsx                   (UPDATED — adds size="lg" variant)
app/_components/files/FileDetailSpine.tsx         (NEW — spine + Mark Delivered button)
app/_components/files/FileCard.tsx                (UPDATED — uses heuristics so cards & detail agree)
app/(app)/files/[id]/layout.tsx                   (UPDATED — renders FileDetailSpine)
app/(app)/settings/page.tsx                       (UPDATED — Workflow editor: phase→tab mapping)
globals.plan-04.css                               (APPEND)
```

## Backend changes

None required. The `phaseTabMap` is part of the workflow definition (client-side
in this patch); future plans can persist workflows server-side without changing
the API shape.

The `Mark Delivered` action uses the existing `{ togglePhase }` PATCH from Plan 2.

## Commit sequence

1. **Commit 1 — Pure heuristics module**
   - `app/_lib/phase-heuristics.ts`
   - `app/_lib/types.ts` (add `phaseTabMap`)
   - Update `app/_lib/workflows-store.tsx` defaults.

2. **Commit 2 — Spine component**
   - `app/_components/StatusSpine.tsx` (add `size` prop)
   - `app/_components/files/FileDetailSpine.tsx`
   - Append `globals.plan-04.css`.

3. **Commit 3 — Render on file detail**
   - `app/(app)/files/[id]/layout.tsx`.

4. **Commit 4 — Card uses same heuristics**
   - `app/_components/files/FileCard.tsx` — pass effective phase from heuristics.

5. **Commit 5 — Settings: phase→tab mapping**
   - `app/(app)/settings/page.tsx` workflow editor.

## Done criteria

- [ ] Open a file with a transcript — Record dot is green automatically.
- [ ] Attach a source — Source dot is green.
- [ ] Generate a draft — Draft dot is green; current pointer advances to Deliver.
- [ ] Click "Mark Delivered" — Deliver dot fills; if the workflow has autoSeal, the file is now sealed.
- [ ] Click any phase on the spine — the corresponding tab is now active.
- [ ] User-set `completedPhases` survives reload; user-marked `current` overrides the heuristic.
- [ ] Card spine and detail spine agree.
