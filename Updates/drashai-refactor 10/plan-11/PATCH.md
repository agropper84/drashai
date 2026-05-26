# Plan 11 — File detail redesign (clean, calm, focused)

The file detail had grown into 5 stacked bands: breadcrumb, fat header, big
workflow spine, tab row, tab body, task rail. Plan 11 strips it back.

## What changes

- **Slim header.** One serif title, Hebrew subtitle, next-event in the right
  column. No more eyebrow + title + Hebrew + congregantName + meta row stack.
- **Workflow spine is hidden by default.** A quiet "Progress" pill in the
  header shows 5 inline dots; click to reveal the full spine + Mark Delivered.
- **Quieter tabs.** Text-only, smaller, single accent underline on active.
- **Five tabs now**: Conversation · Documents · Sources · Draft · Final.
  Insights folds into a per-file Sparks list inside Conversation (Plan 6
  did the data unification; the dedicated Insights tab is gone).
- **Draft is a single centered paper, max 720px.** Word count + read time
  in the top-right corner. No aside.
- **AI helper is a center-bottom floating pill** that expands to a compact
  panel: 4-stop voice slider + instructions + Generate.
- **Tasks are a corner pill** in the bottom-right. Click for a popover.
  The right rail is gone.

## Files in this patch

```
app/(app)/files/[id]/layout.tsx                          (UPDATED — new header, hidden spine, quieter tabs)
app/(app)/files/[id]/conversation/page.tsx               (UPDATED — cleaner type)
app/(app)/files/[id]/draft/page.tsx                      (UPDATED — single paper + helper pill)
app/(app)/files/[id]/insights/page.tsx                   (DELETED — folded into Conversation as a small sparks list)
app/_components/files/HeaderProgressPill.tsx             (NEW)
app/_components/files/CollapsibleSpine.tsx               (NEW)
app/_components/files/TasksPill.tsx                      (NEW — replaces TaskRail in the file detail)
app/_components/draft/HelperPill.tsx                     (NEW — floating AI helper)
app/_components/files/TaskRail.tsx                       (DELETED — replaced by TasksPill)
globals.plan-11.css                                      (APPEND — fd-* rules)
PATCH.md                                                 (this file)
```

## Notable removals

- `TaskRail.tsx` is gone — `TasksPill.tsx` replaces it. The detail-with-rail
  CSS grid is gone too; the file detail now uses a single column.
- `AsidePanel` from earlier Draft tab iterations is gone — its job is split
  between the corner Tasks pill (tasks) and the bottom Helper pill (AI).
- The Insights route is deleted. If you want to keep the URL working, leave
  a redirect at `/files/[id]/insights` → `/files/[id]/conversation`.

## Tab list update

Sidebar / nav changes nothing. Inside the file detail, the tab strip is now:

```tsx
const TABS = [
  { seg: 'conversation', en: 'Conversation' },
  { seg: 'documents',    en: 'Documents' },
  { seg: 'sources',      en: 'Sources' },
  { seg: 'draft',        en: 'Draft' },
  { seg: 'final',        en: 'Final' },
];
```

The Plan 8 `tabForPhase` heuristic still maps phases to tabs and Insights now
maps to 'conversation' (where attached file sparks live in a small subsection).

## ⌘J shortcut

The AI helper pill says "⌘J" — wire this in `Composer` or whichever component
owns the textarea: `if ((e.metaKey || e.ctrlKey) && e.key === 'j') openHelper()`.

## Commit sequence

1. **Commit 1 — Header polish**
   - `app/(app)/files/[id]/layout.tsx`
   - `app/_components/files/HeaderProgressPill.tsx`
   - `app/_components/files/CollapsibleSpine.tsx`
   - Append `globals.plan-11.css` from `.fd-page` through `.fd-spine-*`.

2. **Commit 2 — Tasks pill replaces TaskRail**
   - `app/_components/files/TasksPill.tsx`
   - Delete `app/_components/files/TaskRail.tsx`.
   - Remove the right-column grid from `detail-with-rail` CSS.

3. **Commit 3 — Insights merges into Conversation**
   - Delete `app/(app)/files/[id]/insights/page.tsx`.
   - Add a "Sparks for this file" subsection to the bottom of Conversation
     using `FileSparksTab` from Plan 6.

4. **Commit 4 — Draft redesign**
   - `app/(app)/files/[id]/draft/page.tsx` (single column + helper pill)
   - `app/_components/draft/HelperPill.tsx`

## Done criteria

- [ ] File detail header fits on one screen at 1280×800 with the spine collapsed
- [ ] Clicking "Progress" reveals the spine with a smooth height transition
- [ ] Draft tab body is single-column, max 720px, centered
- [ ] AI helper pill at bottom-center expands to a 600px compact panel
- [ ] Tasks pill in bottom-right shows count, opens popover with task list
- [ ] ⌘J shortcut opens the AI helper from anywhere in the Draft tab
- [ ] Documents tab stays — file attachments still have a dedicated home
- [ ] Old TaskRail.tsx is gone; no dead imports
