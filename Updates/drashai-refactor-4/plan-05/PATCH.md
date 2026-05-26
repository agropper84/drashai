# Plan 5 — Cleanup, polish, and small fixes batch

This patch resolves every finding from the post-Plan 4 audit. It's primarily
defensive — types tightened, races eliminated, contracts clarified, dead drift
removed. No new user-facing surface beyond a few small fit-and-finish wins.

## What lands

**Bug fixes (B-series from the audit)**

- **B1 / B3** — `OverflowMenu` discriminator cleaned up. `MenuItem` no longer
  carries `divider`; a dedicated `MenuEntry` union holds dividers.
- **B4** — `ConversationTab` syncs on `file.updatedAt` so external refreshes
  no longer overwrite-on-save.
- **B5** — `RecordingModal` writes through `useEncounters().patch` instead of
  the raw `api`, with proper error surfacing.
- **B6** — Close is disabled while transcribing.
- **B7** — `addSource` documented as a required backend verb (no code change).
- **B8** — `useCardMenu.duplicate` strips server-side fields and regenerates
  task ids on the copy.
- **B9** — `markDelivered` combines togglePhase + sealed into a single PATCH.
- **B10** — Detail spine: clicking the **dot** toggles, clicking the **label**
  navigates. Cards keep their existing "click anywhere = toggle" behavior.
- **B11** — Phase rename in Settings is deferred to onBlur to stop per-keystroke
  remapping.

**Drift / cleanup (D-series)**

- **D2** — Sidebar Recent prefers `subject` over `topic`.
- **D3** — Top-level `types.ts` widens `Encounter.phase` to `string` so
  custom workflow phases type-check.
- **D4 / D5** — `getById` used everywhere it should be; file detail layout uses
  `useActiveFile`.
- **D7** — Recent files in the sidebar pick a per-type icon.
- **D9** — Sticky note shows a "⌘↵" hint.
- **D11** — `derivePhaseState` ignores archived (no behavior change, just clear).
- **D12** — New helper `isWorkflowDone(ps, wf)` replaces ad-hoc "completed.includes(last)" checks.

## Files in this patch

```
app/_lib/types.ts                                    (UPDATED — phase: string + isWorkflowDone helper export)
app/_lib/phase-heuristics.ts                          (UPDATED — adds isWorkflowDone)
app/_components/OverflowMenu.tsx                      (UPDATED — discriminator)
app/_components/StatusSpine.tsx                       (UPDATED — onDotClick + onLabelClick)
app/_components/StickyNote.tsx                        (UPDATED — keyboard hint)
app/_components/Sidebar.tsx                           (UPDATED — subject + per-type icon)
app/_components/Icons.tsx                             (UPDATED — adds eulogy/wedding/letter glyphs)
app/_components/files/FileCard.tsx                    (UPDATED — fixes B1, B8; uses spine onToggle which keeps current click=toggle)
app/_components/files/FileDetailSpine.tsx             (UPDATED — fixes B9, B10)
app/_components/modals/RecordingModal.tsx             (UPDATED — fixes B5, B6)
app/(app)/files/[id]/layout.tsx                       (UPDATED — uses useActiveFile)
app/(app)/files/[id]/conversation/page.tsx            (UPDATED — fixes B4)
app/(app)/settings/page.tsx                           (UPDATED — fixes B11)
PATCH.md                                              (this file)
```

## Backend verbs to confirm (B7)

Make sure `app/api/rav/encounters/[id]/route.ts` handles every verb below
in a single PATCH body — the new `markDelivered` flow combines two:

| Verb               | Payload                                  |
|--------------------|------------------------------------------|
| transcript         | string (overwrite)                       |
| appendTranscript   | string (append)                          |
| notes              | string                                   |
| addSource          | `{ ref, he, en, note?, addedAt }`       |
| sources            | array (replace — used for removal)       |
| addGenerated       | `{ type, content, generatedAt }`        |
| addTask            | `{ body, due? }`                        |
| toggleTask         | string                                   |
| removeTask         | string                                   |
| togglePhase        | string                                   |
| sealed             | boolean                                  |
| workflowId         | string                                   |
| archive/unarchive  | true                                     |

The handler should apply *all* present verbs in one pass so the mark-delivered
flow remains atomic.

## Commit sequence

1. **Commit 1 — Type + heuristics + Icons additions**
   - `types.ts`, `phase-heuristics.ts`, `Icons.tsx`

2. **Commit 2 — Atomic component updates**
   - `OverflowMenu.tsx`, `StatusSpine.tsx`, `StickyNote.tsx`, `Sidebar.tsx`

3. **Commit 3 — Card + Spine fixes**
   - `FileCard.tsx`, `FileDetailSpine.tsx`

4. **Commit 4 — Modal + Conversation + Layout fixes**
   - `RecordingModal.tsx`, `conversation/page.tsx`, `[id]/layout.tsx`

5. **Commit 5 — Settings polish**
   - `settings/page.tsx`

## Done criteria

- [ ] `pnpm lint` clean
- [ ] `pnpm build` produces typed output (no `@ts-expect-error` workarounds)
- [ ] Edit a transcript in tab A, trigger refresh in tab B — local edit survives until save, then merges correctly
- [ ] Recording modal close button is disabled until transcription finishes
- [ ] Duplicate a file with 3 open tasks — copy has 3 new task ids
- [ ] Click a phase label on the detail spine — navigates, doesn't toggle. Click the dot — toggles, doesn't navigate.
- [ ] Mark delivered on an autoSeal workflow — single PATCH in the network tab
