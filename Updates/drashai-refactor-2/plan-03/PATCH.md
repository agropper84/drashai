# Plan 3 — Safe delete + archive

Builds on Plans 1 & 2. A pastoral file represents a real family — a one-click trash
icon is a foot-gun. This patch:

- Replaces the overflow placeholder button with a real **⋯ menu**: Archive · Duplicate · Delete…
- **Archive** is recoverable (sets `archivedAt`); archived files are hidden by default
  but reachable via a filter chip.
- **Delete** requires a confirm modal that shows the subject name and a **type-to-confirm**
  gate.
- **Settings → Account** gains: *Restore an archived file* and *Erase all archived files*
  (the only destructive action, still gated).

## Files in this patch

```
app/_lib/types.ts                          (already has archivedAt from Plan 2 — re-verified)
app/_lib/api.ts                            (UPDATED — adds archive/unarchive helpers)
app/_components/OverflowMenu.tsx           (NEW)
app/_components/ConfirmDialog.tsx          (NEW)
app/_components/files/FileCard.tsx         (UPDATED — wires menu + delete dialog)
app/(app)/files/page.tsx                   (UPDATED — Active/Archived filter chips)
app/(app)/settings/page.tsx                (UPDATED — Account section adds Archived list)
globals.plan-03.css                        (APPEND to app/globals.css)
```

## Backend changes

Update `app/api/rav/encounters/[id]/route.ts` PATCH handler:

```ts
if (body.archive === true) {
  enc.archivedAt = new Date().toISOString();
}
if (body.unarchive === true) {
  enc.archivedAt = undefined;
}
```

Update `app/api/rav/encounters/route.ts` GET handler — by default, filter out
archived encounters unless `?includeArchived=true` is passed:

```ts
const url = new URL(req.url);
const includeArchived = url.searchParams.get('includeArchived') === 'true';
const all = await listEncounters(userId);
return Response.json({
  encounters: includeArchived ? all : all.filter((e) => !e.archivedAt),
});
```

DELETE handler is unchanged but is now used only from the "Erase all archived"
flow in settings; the per-card Delete action posts `{ archive: true }` first, and
the actual hard-delete happens later via the settings action — or use the existing
DELETE endpoint from the confirm dialog if you prefer immediate hard delete.

## Decision: archive-by-default vs hard delete

The card menu offers BOTH:
- **Archive** (default, one click): recoverable
- **Delete…** (gated): hard delete via confirm dialog

This matches how rabbis actually work — most files should never be deleted; the
ones that *should* be deleted (test data, mistaken duplicates) get the friction.

## Commit sequence

1. **Commit 1 — Atomic components**
   - `app/_components/OverflowMenu.tsx`
   - `app/_components/ConfirmDialog.tsx`
   - Append `globals.plan-03.css` to `app/globals.css`.

2. **Commit 2 — Backend**
   - Update `app/api/rav/encounters/route.ts` (default filter archived)
   - Update `app/api/rav/encounters/[id]/route.ts` (handle `archive`/`unarchive`)

3. **Commit 3 — api.ts helpers + FileCard wiring**
   - `app/_lib/api.ts`
   - `app/_components/files/FileCard.tsx`

4. **Commit 4 — File list filter chips**
   - `app/(app)/files/page.tsx` (adds Active / Archived chips)

5. **Commit 5 — Settings: Archived files panel**
   - `app/(app)/settings/page.tsx`

## Done criteria

- [ ] No one-click destructive action anywhere in the app
- [ ] Archived files survive page refresh and a soft-restore returns them intact
- [ ] Delete dialog requires typing the subject's name (or "DELETE") to enable
- [ ] Archived files visible in Settings → Account → Archived
- [ ] "Erase all archived" requires its own typed confirm
