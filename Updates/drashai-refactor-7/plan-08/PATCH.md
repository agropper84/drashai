# Plan 8 — Inline source insertion + header & task-rail polish

Combines two streams:

**A. UX polish triggered by the screenshot review:**
- Header layout no longer reserves the rail's column when the rail is collapsed.
  Closing the rail fully reclaims the width.
- Header drops the duplicate subject line when subject === congregantName.
- Header drops the dangling `test` italic-only secondary when nothing else is set.
- Status spine renders even when no workflow matches the file's template — it
  falls back to a generic Meet → Record → Source → Draft → Deliver workflow so
  the spine is always there.

**B. Plan 8 proper — inline source insertion in the composer:**
- `⌘K` while writing opens a slim inline source picker.
- Typing `/source` followed by space opens the same picker as a slash command.
- Picked sources are inserted as a styled inline blockquote with Hebrew +
  English + citation.
- A right-rail section in the Draft tab lists the file's attached sources;
  drag or click a row to insert it into the composer at the caret position.

## Files in this patch

```
app/_lib/types.ts                                       (unchanged from Plan 7)
app/_lib/source-token.ts                                (NEW — inline source token format)
app/_lib/use-active-file.ts                             (unchanged)
app/_components/files/TaskRail.tsx                      (UPDATED — fully-collapsible)
app/_components/draft/SourcePicker.tsx                  (NEW — ⌘K + /source palette)
app/_components/draft/AttachedSourcesPanel.tsx          (NEW — rail section in draft tab)
app/_components/draft/InlineSource.tsx                  (NEW — renders a source token)
app/_components/draft/Composer.tsx                      (NEW — wraps the writing area + picker)
app/(app)/files/[id]/layout.tsx                         (UPDATED — full collapse, header fixes)
app/(app)/files/[id]/draft/page.tsx                     (UPDATED — uses Composer + AttachedSourcesPanel)
globals.plan-08.css                                     (APPEND)
PATCH.md                                                 (this file)
```

## Inline source token format

Sources live in the draft as plain-text tokens so we stay textarea-friendly:

```
{{source:Bereishit 18:6|וַיְמַהֵר אַבְרָהָם...|Knead, and make cakes.}}
```

Format: `{{source:REF|HEBREW|ENGLISH}}`. Pipes and braces inside the body are
URL-encoded by the inserter. The renderer (`InlineSource`) walks the draft
once on every render and replaces tokens with a styled component when in
"preview" mode.

We keep the editor in textarea form (with tokens visible while typing) and
toggle a "rendered" preview for reading. This avoids the contentEditable
rabbit hole and keeps Plan 1's textarea-token decision intact.

## Header & task rail fixes

### Layout grid

The detail page used:

```css
.detail-with-rail { grid-template-columns: 1fr 280px; }
.detail-with-rail.rail-collapsed { grid-template-columns: 1fr 40px; }
```

Even when collapsed, the rail still claims 40px AND adds a 24px gap, costing
~64px from the main content. Worse, the header is INSIDE the main column,
so the title's right edge is the gap, not the page edge.

Plan 8 replaces this with **full-collapse**:

```css
.detail-with-rail { grid-template-columns: 1fr 280px; gap: 24px; }
.detail-with-rail.rail-collapsed { grid-template-columns: 1fr; gap: 0; }
.detail-with-rail.rail-collapsed .task-rail { display: none; }
```

The collapsed rail is replaced by a floating tab/handle that's pinned to the
right edge of the viewport, NOT in the grid. Clicking it re-expands the rail.

### Header copy

The header had two bugs:
1. `<div className="file-detail-title">{file.subject || file.congregantName}</div>`
   followed by `<div className="file-detail-en">{file.congregantName}</div>`.
   When subject was unset, both lines showed congregantName.
2. `subjectHeb` showed when present but its presence was unconditional in the
   layout, leaving a stray italic when subject was set to a Latin name.

Fix: explicitly render the subject as the title and only render the
congregantName beneath when it's different from the subject.

### Status spine fallback

`FileDetailSpine` early-returned `null` when no workflow matched the file's
type. New files often have no `type` set, so the spine never rendered.

Fix: `workflows-store` now exposes a `getEffectiveWorkflow(file)` helper that
returns the matched workflow OR a generic 5-phase fallback. The spine always
renders with at least the fallback workflow.

## Commit sequence

1. **Commit 1 — Header + rail polish (the screenshot fixes)**
   - `app/(app)/files/[id]/layout.tsx`
   - `app/_components/files/TaskRail.tsx`
   - `app/_lib/workflows-store.tsx` (add fallback helper)
   - Append rail/header CSS rules to `app/globals.css` (from `globals.plan-08.css`).

2. **Commit 2 — Inline source token infrastructure**
   - `app/_lib/source-token.ts`
   - `app/_components/draft/InlineSource.tsx`

3. **Commit 3 — Source picker (⌘K + /source)**
   - `app/_components/draft/SourcePicker.tsx`

4. **Commit 4 — Composer wrapper**
   - `app/_components/draft/Composer.tsx`

5. **Commit 5 — Attached sources rail section**
   - `app/_components/draft/AttachedSourcesPanel.tsx`

6. **Commit 6 — Wire into the Draft tab**
   - `app/(app)/files/[id]/draft/page.tsx`

## Done criteria

- [ ] Header title sits on the left at full width when the rail is collapsed
- [ ] Subject duplicate gone — congregantName only renders when it differs
- [ ] Status spine renders on every file, even without a matched workflow
- [ ] Task rail collapse fully removes it; a floating "Tasks" handle docks to the right edge
- [ ] Click the handle: rail slides back in
- [ ] Press `⌘K` while writing in the composer: picker opens; pick a source; it inserts at the caret
- [ ] Type `/source` and space: picker opens; same insertion behavior
- [ ] Inserted source renders as a styled inline block with Hebrew + English + citation in the rendered preview
- [ ] Right rail "Attached sources" lists this file's sources; click any to insert
