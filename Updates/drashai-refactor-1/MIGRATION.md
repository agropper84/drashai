# Plan 1 — Split `app/page.tsx` — Migration Guide

This folder contains a refactored `app/` tree extracted from your current 2,333-line
`app/page.tsx`. Apply it commit-by-commit; each commit ships green.

---

## 0. One-time path fix

This prototype's filesystem doesn't allow parentheses in folder names, so directories
like `app/(app)` were saved as `app/-app-` and `[id]` was saved as `-id-`.

**Before copying into your Next.js repo, rename these:**

```bash
cd drashai-refactor/app

# Rename the route-group folder
mv -app- '(app)'

# Rename the dynamic-segment folder
cd '(app)/files'
mv -id- '[id]'
cd ../..
```

A helper script `rename-folders.sh` is included in this folder.

---

## 1. Pre-flight checks

- Your repo is on Next.js 16 with React 19 and the App Router — ✅ verified.
- You're using `iron-session` for auth in `lib/session.ts` — ✅ verified.
- You have an alias `@/` pointing to the repo root (or `@/app/...` to `app/`).
  If not, add to `tsconfig.json`:
  ```json
  {
    "compilerOptions": {
      "paths": { "@/*": ["./*"] }
    }
  }
  ```
- Your `app/globals.css` design system is **untouched**. All new components use the
  existing classes (`btn`, `card`, `sidebar`, `tabs`, etc).

---

## 2. The 7-commit plan

Each commit is small enough to review in one sitting and ships working.

### Commit 1 — Add shared modules (no behavior change)

Copy these files into your repo:

```
app/_lib/types.ts
app/_lib/api.ts
app/_lib/theme.ts
app/_components/Icons.tsx
```

Then in your current `app/page.tsx`:
- Replace the inline interfaces with `import type { Encounter, ... } from '@/app/_lib/types'`
- Replace the inline `const I = {...}` with `import { I } from '@/app/_components/Icons'`
- Replace inline `fetch('/api/...')` calls with `api.encounters.list()`, etc.

Run `pnpm dev`, verify everything still works. Commit.

### Commit 2 — Add providers (still no route changes)

Copy these:

```
app/_lib/encounters-store.tsx
app/_lib/templates-store.tsx
app/_lib/sparks-store.tsx
app/_lib/library-store.tsx
app/_lib/use-active-file.ts
app/_components/Brand.tsx
app/_components/Crumb.tsx
app/_components/recording/useRecorder.ts
```

These are just the modules. They aren't wired in yet. Commit.

### Commit 3 — Build the `(app)` route group + auth gate (biggest commit)

Copy:

```
app/(app)/layout.tsx
app/_components/AppShell.tsx
app/_components/Sidebar.tsx
app/_components/modals/ModalProvider.tsx
app/_components/modals/NewFileModal.tsx
app/_components/modals/RecordingModal.tsx
app/_components/modals/SourceModal.tsx
app/(app)/files/page.tsx
app/_components/files/FileCard.tsx
```

Then **move the old `app/page.tsx` aside** (rename to `app/page.tsx.old` for now) and
copy the new minimal redirect:

```
app/page.tsx          ← redirect / → /files
```

At this point you have:
- `/` redirects to `/files`
- `/files` renders the home (file list) via the new shell
- Login still works (your existing `/login` page is unchanged)
- Sidebar links to `/sparks`, `/templates`, `/library`, `/settings` will 404 — that's OK

Verify auth still works (sign out, sign in). Commit.

### Commit 4 — Split the file detail into route segments

Copy:

```
app/(app)/files/[id]/layout.tsx
app/(app)/files/[id]/page.tsx                 ← redirect to /conversation
app/(app)/files/[id]/conversation/page.tsx
app/(app)/files/[id]/documents/page.tsx
app/(app)/files/[id]/sources/page.tsx
app/(app)/files/[id]/insights/page.tsx
app/(app)/files/[id]/draft/page.tsx
app/(app)/files/[id]/final/page.tsx
```

Verify deep-linking: paste `/files/<some-id>/draft` directly and confirm it loads.
Browser back/forward should navigate between tabs cleanly. Commit.

### Commit 5 — Split sparks, templates, library, settings

Copy:

```
app/(app)/sparks/page.tsx
app/(app)/templates/page.tsx
app/(app)/library/page.tsx
app/(app)/settings/page.tsx
```

Verify all four routes load correctly. Library, in particular — confirm all your
recent additions (folders, suggested-search delete, URL/upload buttons) survived.
Commit.

### Commit 6 — Modernize the login page

Copy:

```
app/login/page.tsx
```

The new version replaces the Tailwind hero with design-system classes so login
matches the rest of the app. Commit.

### Commit 7 — Cleanup

- Delete `app/page.tsx.old` (the original 2,333-line file).
- Audit imports — anything pointing at the deleted path is dead.
- Run `pnpm build`. You should see per-route chunks under `.next/static/chunks/app/`.
- Run `pnpm lint`. Fix anything.
- Commit.

---

## 3. What's preserved exactly

- All API routes (`app/api/*`) — untouched.
- `lib/session.ts`, `lib/kv.ts`, `lib/ai.ts`, `lib/encryption.ts`, `lib/oauth.ts` — untouched.
- `app/globals.css` — untouched.
- `app/layout.tsx` (root) — untouched.
- All your recent library work — folders, deletable suggested searches, URL & upload
  buttons, per-source folder picker, copy-to-sparks, copy-to-file.
- All your sparks features — voice notes, URL, upload, screenshot paste, merge,
  category filter.
- Templates editor — full body editor, style documents, variable picker.
- Draft tab — composer, AI mode, preserve slider, zen mode, streaming generation.

---

## 4. What's NOT changing in this Plan 1

Deliberately preserved for later plans:

- **#1 status spine** — `phase` field added to types but no UI yet.
- **#2 home card redesign** — FileCard kept close to original; redesign in Plan 2.
- **#3 safe delete** — still uses `confirm()` for now; Plan 3 builds the proper modal.
- **#6 sparks unification** — Sparks split into two views still; Plan 6 unifies via `fileId`.
- **#7 single voice slider** — Heavy/Collab/Light + Preserve still both present.

---

## 5. Done criteria

- [ ] Every file in `app/` is ≤ 400 lines
- [ ] `pnpm build` produces per-route chunks
- [ ] Deep-linking to `/files/<id>/draft` works
- [ ] Browser back/forward navigates tabs cleanly
- [ ] Unauthed users at `/files` redirect to `/login` server-side (no JS flash)
- [ ] `pnpm lint` clean
- [ ] Library recent additions all working
- [ ] No `useState` in the new `app/page.tsx` (only `redirect()`)
