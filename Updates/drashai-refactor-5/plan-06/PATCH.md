# Plan 6 — Sparks unification

Currently Drashai has two sparks experiences that don't share data:

- **Global Sparks page** (`/sparks`) — a client-side array in `SparksProvider`.
- **Per-file Insights tab** — a separate (empty in Plan 1) array filtered by
  `fileId`.

The user has to manually "merge" sparks from one into the other. Plan 6 makes
them **two views of the same data**, persisted server-side, with a single
`fileId` field doing the routing.

## What changes

- **Server-side persistence** of sparks via a new `/api/sparks` endpoint set.
- **`SparksProvider` refactor** — now backed by a typed CRUD API exactly like
  encounters. Optimistic updates + refresh on mount.
- **Per-file Insights tab** becomes a real surface: it shows `sparks.filter(s => s.fileId === fileId)`.
  Creating from the sticky note (with the file's id) lands directly in this tab.
  No merging step.
- **Global Sparks** gains a filter chip set: *All · Unassigned · For Goldberg · For Tamar & Eitan…*
  Each spark card has an "Assign to file…" select that sets `fileId` — the
  same UX as the current "Merge to file" but using `fileId` instead of
  appending to the transcript.
- **Auto-categorize** new sparks on creation. A lightweight call to
  `/api/sparks/classify` returns a suggested category; the user can correct it
  inline with a one-click pill.
- **Sticky note** "Insight" destination now sets `fileId` (was already correct
  at the call site in Plan 2; Plan 6 makes the data flow real).

## Files in this patch

```
app/_lib/types.ts                                   (UPDATED — Spark gets createdAt/updatedAt, tag is optional)
app/_lib/api.ts                                     (UPDATED — adds sparks namespace)
app/_lib/sparks-store.tsx                            (REWRITE — server-backed)
app/_components/files/FileSparksTab.tsx              (NEW — the per-file insights tab body)
app/(app)/files/[id]/insights/page.tsx               (UPDATED — uses FileSparksTab)
app/(app)/sparks/page.tsx                            (UPDATED — file filter, assign-to, drop transcript-merge)
api/sparks/route.ts                                  (NEW — GET, POST)
api/sparks/[id]/route.ts                             (NEW — PATCH, DELETE)
api/sparks/classify/route.ts                         (NEW — auto-categorize, optional)
PATCH.md                                             (this file)
```

## Data model

```ts
interface Spark {
  id: string;
  body: string;
  tag?: string;
  category?: string;
  /** Plan 6 — when set, this spark is "an insight for this file". */
  fileId?: string;
  /** Plan 9 — link to a recording moment. */
  momentT?: number;
  url?: string;
  /** Date label for display. */
  when: string;
  createdAt: string;
  updatedAt: string;
}
```

## KV layout

Mirror your encounter storage. Suggested keys:

```
sparks:{userId}                → string[]                 (list of spark ids, newest first)
sparks:{userId}:{sparkId}      → Spark                    (the record)
```

`GET /api/sparks?fileId=xxx` reads the index, filters where `fileId === xxx`
when the query param is set (or `unassigned` for null), and returns the records
in order.

## Backend endpoints

### `GET /api/sparks`
Query params:
- `fileId` — filter to one file (use the literal `unassigned` for global-only)

Returns `{ sparks: Spark[] }`.

### `POST /api/sparks`
Body: `Partial<Spark>`. Server fills `id`, `createdAt`, `updatedAt`, `when`.
Returns `{ spark: Spark }`.

### `PATCH /api/sparks/[id]`
Body: any subset of mutable fields. Verbs to support:
- `{ body, tag, category, url, fileId }` — direct field set
- `{ assignTo: fileId | null }` — convenience for the assign-to dropdown
- `{ clearFile: true }` — convenience for "back to inbox"

### `DELETE /api/sparks/[id]`
Returns 204.

### `POST /api/sparks/classify` (optional)
Body: `{ body: string }`.
Calls Claude with a small prompt and returns `{ category: string }`.
The frontend uses this **best-effort** — it doesn't block creation.

## Migration of existing sparks

`SparksProvider` in Plan 1 was a client-only `useState`. If users have any
in-memory sparks at this point, they'll be lost on reload anyway, so no
migration script is needed. Add a one-time message in the empty state:
"Sparks are now saved permanently."

## Commit sequence

1. **Commit 1 — Type updates**
   - `app/_lib/types.ts`

2. **Commit 2 — Backend endpoints**
   - `api/sparks/route.ts`
   - `api/sparks/[id]/route.ts`
   - (optional) `api/sparks/classify/route.ts`

3. **Commit 3 — Client API + provider rewrite**
   - `app/_lib/api.ts`
   - `app/_lib/sparks-store.tsx`

4. **Commit 4 — Per-file insights tab**
   - `app/_components/files/FileSparksTab.tsx`
   - `app/(app)/files/[id]/insights/page.tsx`

5. **Commit 5 — Global sparks page refactor**
   - `app/(app)/sparks/page.tsx`
   - The "Merge to file" select becomes "Assign to file"
   - Add file-filter chip row above the grid

## Done criteria

- [ ] Sparks survive a hard refresh (server-persisted)
- [ ] Creating a spark from the sticky note with "Insight" lands in the file's Insights tab AND shows up in the global sparks list when filter = "All"
- [ ] Changing a spark's "Assign to" in the global view immediately removes it from the file's Insights tab and back to the inbox (or to the other file)
- [ ] Deleting a spark removes it from both views
- [ ] Auto-categorization fires once per new spark, doesn't block UI, and can be corrected with one click
- [ ] Per-file Insights tab and global Sparks tab show the same spark when the spark is assigned to that file
