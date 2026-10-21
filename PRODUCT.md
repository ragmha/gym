# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Product purpose

An iOS-first daily health dashboard. Its home screen helps the user
review steps, recorded cardio and lifting, water, and morning weight at a glance.
Apple HealthKit is the only source of real health data. Web and Android are
explicitly labelled, deterministic design previews. There is no Gym account or
backend.
The user approved one manual-entry exception: saving a confirmed body weight
and its actual measurement date/time directly to Apple Health.

## Capabilities and constraints

- Home, Steps, Coach, and Settings share a date-aware navigation stack;
  Achievements covers the past year. There is no tab bar, account, or backend.
- **Add weight** beside Morning weight opens an ephemeral kilograms/date/time
  form on compatible iOS builds. Only an explicit **Save to Apple Health**
  requests body-mass write access and saves. It does not authorize other
  manual-entry features, local persistence, or editing/deleting Health samples.
- Native permission-request completion is not success. A native saved sample
  is required, errors preserve the form, and Home rereads Health on return.
  Saving can succeed without read-back access; unavailable readings stay honest.
- Current-day entries default to now. A past selected day uses a visibly
  disclosed current local clock time that the user must correct and confirm.
  Invalid/future times are prohibited. Afternoon readings remain afternoon
  readings and do not replace the earliest-before-noon morning measurement.
- Weight writing and its native date/time picker require a compatible immutable
  native version (1.0.7 or later with weight-entry modules). Old/missing native
  capabilities, web, and Android show an explicit unavailable explanation.
- Missing readings remain unavailable, not invented zeroes. Recorded zeroes
  remain visible. Workout duration and average heart rate do not prove time in
  a heart-rate zone.
- Lifting opens on **Programme overview**, a week-grouped grid of workout and
  rest days. Tap a day to open its saved workout or scheduled date; Back returns
  to the overview. Starting or restarting the programme is an explicit action
  on the overview, never a side effect of browsing.
- **Running out of time? 5×5** on the overview opens a StrongLifts 5×5 short
  day for the same date, alternating Workout A and B with a next-weight hint.
  It needs no programme start and is hidden once a programme workout is logged
  for that date.
- The lifting workout screen can optionally connect to Spotify on iOS to show
  the current track and album art, control previous, play/pause, and next, and
  browse and play Spotify's recent and recommended playlists and their contents.
  This is not the full playlist library; **Open Spotify** remains available.
  Spotify handles authorization and playback. Artwork stays in memory after
  the SDK's temporary image files are deleted; Gym does not save music data or
  send it to Health or the coach. Web and Android only offer **Open Spotify**.
- The overview marks the selected day and shows saved finished workouts as
  **Completed** across dates and restarts. Unfinished sets and elapsed days do
  not imply completion. Days without an available workout date stay disabled
  rather than opening or overwriting a different saved workout, and days
  scheduled after the selected date stay disabled until that date arrives.
- Morning weight comparisons show measured coverage, not diet advice.
- The on-device coach reads the existing daily context only.
- Apple Books shares no reading time. On native 1.0.13+ iOS builds, tapping
  Reading starts a Dynamic Island timer and opens Apple Books; tapping it again
  (or the island's Stop) ends it. The tile shows that day's last session in
  whole minutes until the app closes. Minutes are never saved or sent to Health.
- **Apple Watch** shows today's lifting day and logs or undoes sets in the
  iPhone's on-device lifting log. It needs the iPhone reachable and saves
  nothing on the watch or to Health.
- Rep counting (native 1.0.18+): **Count reps** on the watch estimates vertical
  wrist-motion cycles after **Start** and a stillness check. Adjust the motion
  threshold, correct with the Digital Crown, then log. Wrist-down counting uses
  an extended runtime session; if unavailable or interrupted, stop with an error.
  On iOS 17+, **Count** in Lifting uses the front camera for knee, hip, or elbow
  cycles, with an adjustable bend threshold and explicit Start/Done/Use controls.
  Tracking gaps never count as reps. Use fills the editable reps field; you still
  tap the set to log. Motion and video are never saved or sent to Health/the coach.
  Both are estimates requiring physical-device calibration, not form assessments.
- Deep Work runs 25-minute focus blocks alternating with 5-minute breaks until
  ended. Tapping the tile starts or pauses it; tapping it while paused offers
  Resume or End. On native 1.0.13+ iOS builds a silent Dynamic Island countdown
  shows the current block; it reaches 0:00 rather than flipping to the next
  block until the app is opened. Sessions stay in memory only: never saved,
  written to Health, or given to the coach.
- Theme selection, accessible controls, and light and dark appearances remain
  supported. The experimental Phone rest report retains its privacy and
  distribution restrictions.

## Visual commitment

The user supplied health-app references with white surfaces, bright-blue
accents, generous spacing, lighter numeric typography, and softly rounded
panels, and approved applying that visual language across the whole app.
Reference photos, maps, profile controls, and charts are not evidence that the
app has those assets, features, or measurements.

## Product principles

- Make the five daily priorities easy to scan.
- Read what Health already records rather than asking for duplicate entry.
- Limit manual input to the explicitly approved Apple Health body-mass save;
  all dashboard values continue to come back through HealthKit.
- Keep every visible measurement and completion state traceable to its source.
- Preserve native navigation, safe areas, and readable, scalable text.
