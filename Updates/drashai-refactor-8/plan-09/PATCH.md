# Plan 9 — Recording sticky bar + moment markers + ethereal vis

The recording modal traps the rabbi inside it. If they navigate away, they
lose the recording. Worse, the visual is a hard waveform — wrong tone for a
hospital room, a shiva visit, a wedding-prep conversation. Plan 9 unmodalizes
recording entirely.

## What changes

**A. Sticky bar replaces the modal mid-recording.**
- The vow phase stays modal (necessary for consent).
- The moment "Begin recording" is clicked, the modal collapses to a 56px
  bar pinned to the bottom-right corner. Persists across page navigation.
- Bar shows: ethereal animation · elapsed time · ⚑ Mark moment · ⏸ Pause · ⏹ End.

**B. Ethereal recording animation.**
- Replaces the bouncing waveform bars.
- A slow concentric breathing motion — a single luminous dot at the center,
  ringed by 3 softly pulsing circles that expand and fade at 8s intervals.
  No sharp edges, no audio-reactive jumpiness. Reads as "I'm listening,"
  not "I'm analyzing."
- Audio level (when available) gently modulates the central dot's
  luminosity — a subtle 0.6 → 1.0 alpha range. Goes nowhere if mic input
  is silent.
- Respects `prefers-reduced-motion` — degrades to a steady glow.
- Works at three sizes: 32 (sticky bar), 96 (modal recording phase), 160 (review).

**C. Moment markers.**
- During recording, ⚑ button drops a timestamped marker.
- Each marker is captured as a `Spark` with `fileId` and `momentT` set.
- After recording ends, markers appear pre-rendered in the file's Insights
  tab with a "@03:14 in recording" badge.
- During recording, the user can type a short label for the marker inline.

**D. Vow gate tightening.**
- The vow phase now asks the rabbi to **type the family name** before recording
  begins. Friction is small (3 seconds) but signals the moral weight of what's
  about to happen. The typed name is stored on the encounter for audit.

## Files in this patch

```
app/_lib/types.ts                                   (UPDATED — RecordingSession, Moment.label)
app/_components/recording/EtherealVis.tsx           (NEW)
app/_components/recording/useRecorder.ts            (UPDATED — exposes audio level + moments)
app/_components/recording/RecordingBar.tsx          (NEW — sticky bar)
app/_components/recording/RecordingProvider.tsx     (NEW — global state for ongoing recording)
app/_components/recording/VowDialog.tsx             (NEW — extracted vow phase with name gate)
app/_components/modals/RecordingModal.tsx           (UPDATED — vow only; hands off to RecordingProvider)
app/_components/AppShell.tsx                        (UPDATED — wraps with RecordingProvider, renders RecordingBar)
app/_components/Sidebar.tsx                         (UPDATED — recording indicator on Files nav item)
globals.plan-09.css                                 (APPEND)
PATCH.md                                            (this file)
```

## Why a Provider, not just a hook?

The recording must survive route navigation. Putting state in a tab-local
hook would lose it on a route push. `RecordingProvider` lives high in
`AppShell` so the recorder is mounted exactly once and the bar follows
the user anywhere in the authed app.

## Animation timing (informed by ambient-music timing conventions)

| Element                  | Period | Notes                                       |
|--------------------------|--------|---------------------------------------------|
| Center dot luminosity    | 4.0s   | Slow pulse — like breathing                 |
| Outer ring 1 expansion   | 8.0s   | Phase-offset 0.00                           |
| Outer ring 2 expansion   | 8.0s   | Phase-offset 0.33                           |
| Outer ring 3 expansion   | 8.0s   | Phase-offset 0.66                           |
| Audio-level → dot alpha  | <100ms | Smoothed; never below 0.55                  |
| Paused state             | static | All rings frozen; center dot stays at 0.6   |

Color: `var(--accent-soft)` for outer rings, `var(--accent)` for the dot.
In sacred theme, the dot becomes `var(--gold)` — warmer in dark mode.

## Backend changes

Encounters PATCH handler gets one new verb (for moment markers — they're sparks
under the hood, so they use the existing sparks API instead). No encounter
schema change beyond `moments` already added in Plan 2.

**Sparks** API (from Plan 6) handles markers via:
- `POST /api/sparks` with `{ body, fileId, momentT, tag: 'Moment' }`

If you want markers ALSO mirrored into `encounter.moments`, add to the
encounter PATCH handler:

```ts
if (body.addMoment) {
  enc.moments = [...(enc.moments || []), {
    t: body.addMoment.t,
    label: body.addMoment.label,
    createdAt: new Date().toISOString(),
  }];
}
```

The Plan 9 frontend uses sparks-as-markers as the source of truth; the
encounter.moments array is optional redundancy.

## Commit sequence

1. **Commit 1 — Ethereal vis component**
   - `app/_components/recording/EtherealVis.tsx`
   - Append the vis CSS rules from `globals.plan-09.css`.

2. **Commit 2 — Recorder hook upgrades**
   - `app/_components/recording/useRecorder.ts`
   - Adds audio-level analyzer + moment array + label support.

3. **Commit 3 — RecordingProvider + RecordingBar**
   - `app/_components/recording/RecordingProvider.tsx`
   - `app/_components/recording/RecordingBar.tsx`
   - Wire `<RecordingProvider>` + `<RecordingBar/>` into `AppShell`.

4. **Commit 4 — Vow gate**
   - `app/_components/recording/VowDialog.tsx`
   - Update `RecordingModal.tsx` to delegate vow phase to VowDialog and
     hand off the active session to RecordingProvider.

5. **Commit 5 — Sidebar indicator**
   - `app/_components/Sidebar.tsx` — small pulsing dot on the Files item
     when a recording is in progress.

## Done criteria

- [ ] Start a recording; navigate to Sources, Library, Sparks — sticky bar follows you with the timer still incrementing
- [ ] Tap ⚑ during recording, type "her hands" — after stopping, a Spark with momentT~=N appears in Insights with a "@MM:SS in recording" badge
- [ ] Recording vis is a single dot + 3 slow rings; no audio-reactive bouncing; respects prefers-reduced-motion
- [ ] Vow gate requires typing the family name before "Begin" enables
- [ ] Pause freezes the rings and the timer; Resume restarts both
- [ ] End & Save brings the rabbi to the file's Conversation tab with the transcript appended
