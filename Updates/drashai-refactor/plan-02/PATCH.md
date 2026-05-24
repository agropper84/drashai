# Plan 2 — Home cards, status spine, sticky notes, tasks, workflows

This patch builds on the Plan 1 refactor. Apply after Plan 1 is in.

## What it adds

- **DetailedCard (V3) + MinimalCard (V4)** with a subtle toggle on the Files page.
- **Interactive status spine** — click any phase dot or label to mark it done.
- **Per-workflow setting** for show-spine and default view.
- **Hover sticky note** on every card — capture quick text and route to Spark · Insight (for this file) · Task.
- **Task rail** on the file detail — collapsible right sidebar in line with the header.
- **Workflows settings section** — modify phases, link to templates, set defaults.

## Files in this patch

```
app/_lib/types.ts                       (UPDATED — adds Task, Workflow, extends Encounter)
app/_lib/workflows-store.tsx            (NEW)
app/_components/StatusSpine.tsx         (NEW)
app/_components/StickyNote.tsx          (NEW)
app/_components/ViewToggle.tsx          (NEW)
app/_components/files/FileCard.tsx      (UPDATED — new DetailedCard/MinimalCard)
app/_components/files/TaskRail.tsx      (NEW)
app/(app)/files/page.tsx                (UPDATED — view toggle, show-spine, sticky handlers)
app/(app)/files/[id]/layout.tsx         (UPDATED — adds task rail)
app/(app)/settings/page.tsx             (UPDATED — adds Workflows section)
globals.plan-02.css                     (APPEND to app/globals.css)
```

## Backend changes required

Plan 2 introduces three new encounter fields that need API support. Update
`app/api/rav/encounters/[id]/route.ts` to handle these PATCH bodies:

| Body                            | Effect                                                  |
|---------------------------------|---------------------------------------------------------|
| `{ addTask: { body, due? } }` | Append a new task with a generated id                   |
| `{ toggleTask: taskId }`       | Flip the `done` flag on a task                         |
| `{ removeTask: taskId }`       | Remove a task by id                                     |
| `{ togglePhase: phaseName }`   | Toggle membership in `completedPhases[]`              |
| `{ workflowId: 'xxx' }`        | Link this file to a workflow                            |

Implementation sketch (add to your existing PATCH handler):

```ts
if (body.addTask) {
  enc.tasks = [...(enc.tasks || []), {
    id: crypto.randomUUID(),
    body: body.addTask.body,
    done: false,
    due: body.addTask.due || null,
    createdAt: new Date().toISOString(),
  }];
}
if (body.toggleTask) {
  enc.tasks = (enc.tasks || []).map(t =>
    t.id === body.toggleTask ? { ...t, done: !t.done } : t
  );
}
if (body.removeTask) {
  enc.tasks = (enc.tasks || []).filter(t => t.id !== body.removeTask);
}
if (body.togglePhase) {
  const completed = enc.completedPhases || [];
  enc.completedPhases = completed.includes(body.togglePhase)
    ? completed.filter(p => p !== body.togglePhase)
    : [...completed, body.togglePhase];
}
if (body.workflowId) {
  enc.workflowId = body.workflowId;
}
```

## Commit sequence

1. **Commit 1 — Type updates + workflows store**
   - `app/_lib/types.ts`
   - `app/_lib/workflows-store.tsx`
   - Wire `<WorkflowsProvider>` into `AppShell.tsx` (next to TemplatesProvider).

2. **Commit 2 — Backend: tasks + phases + workflowId**
   - Update `app/api/rav/encounters/[id]/route.ts` per sketch above.

3. **Commit 3 — Atomic components**
   - `app/_components/StatusSpine.tsx`
   - `app/_components/StickyNote.tsx`
   - `app/_components/ViewToggle.tsx`
   - `app/_components/files/TaskRail.tsx`
   - Append `globals.plan-02.css` content to `app/globals.css`.

4. **Commit 4 — File card redesign + list page toggle**
   - `app/_components/files/FileCard.tsx` (replaces the Plan 1 placeholder)
   - `app/(app)/files/page.tsx` (view toggle + show-spine state, sticky-note handlers)

5. **Commit 5 — File detail task rail**
   - `app/(app)/files/[id]/layout.tsx` (renders the rail; layout becomes a grid)

6. **Commit 6 — Workflows section in Settings**
   - `app/(app)/settings/page.tsx` (adds a new section after Appearance)

Each commit ships green.

## What's deferred

- Plan 3 will replace the overflow menu's "Delete" with a proper confirm dialog.
- Plan 4 (status spine) — this patch already ships it on cards; Plan 4 adds it to the file detail header too.
- Plan 6 (sparks unification) — sticky-note "Insight" still feeds a per-file array; full unification later.
- Plan 7 (single voice slider) — Draft tab unchanged.
