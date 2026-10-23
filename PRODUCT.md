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
The approved Health manual-entry exceptions are confirmed body weight at its
actual measurement time, water for today, and a confirmed meal-photo estimate
for today. The [canonical project policy](.github/copilot-instructions.md)
records their exact boundaries and the separately approved on-device tools.
These exceptions do not authorize additional forms, persistence, or Health writes.

## Capabilities and constraints

- **Inbox Zero** is an opt-in Google sign-in exception on native iOS 1.0.21+.
  It reads Gmail inbox metadata (sender, subject and List-Unsubscribe headers)
  in user-requested pages, groups loaded messages by sender and discloses partial
  counts. No message bodies, attachments, remote images or archived mail are read.
  A separate review and confirmation can move up to 1,000 selected, loaded
  messages to Gmail Trash, with per-message read-back before claiming success.
  Gmail normally permanently deletes Trash after 30 days; Gym never calls a
  permanent-delete endpoint. Failed/partial cleanup requires a refresh.
  Unsubscribe is separate: review an email-provided HTTPS destination, explicitly
  open it and finish in the browser. Opening is not a confirmed unsubscribe.
  No mail is sent, no automatic/background cleanup runs and no backend is added.
  Email and access tokens stay in this screen's memory and are discarded on
  disconnect/exit; reconnect when access expires. No refresh token is requested
  or persisted. The Google grant itself remains until revoked in Google Account
  settings. Nothing enters Health, the coach, personal stores or App Groups.
  Web, Android and incompatible iOS builds show an unavailable explanation.

- **Today** is the first Home pager page for the current day. Swipe to the
  next page for the existing goal tiles; historical days keep their goal pages.
  The reference-style dot grid summarizes the existing Steps and Gym priorities,
  not an invented score for every habit. Activity summaries distinguish Health
  readings, on-device logs, ephemeral timers and activities that are not measured.
  The **Steps + Gym** percentage, goal badge and dot-grid card remain unchanged.
  A Calendar-driven agenda groups the day into **Morning**, **Afternoon** and
  **Night**, with **Anytime** for undated, overdue and all-day items. It suggests
  activities in genuine Calendar gaps rather than presenting a generic to-do
  list. Secondary readings stay under **Activity**; refresh and privacy details
  are disclosed. Actual connection failures, urgent reminder counts and missing
  commute coverage stay visible.
- On native 1.0.20+ iOS 17+ builds, Today reads Apple Calendar and eligible
  incomplete and completed-today Apple Reminders after separate explicit
  permission requests. Calendar events, reserved work, commute times and
  suggested activities are read-only rows. Only actual Reminders have
  checkboxes: an explicit tap can complete or uncomplete an existing reminder
  after native authorization, writable-calendar and saved-state checks.
  There is no optimistic completion, task creation, deletion or editing of
  titles/dates. Urgency means overdue, due within an hour, or high priority;
  completed reminders are never urgent. Alerts are on-screen only, not
  background notifications or email scanning.
- The day plan reserves weekday work (09:00–17:00 by default), Calendar events,
  and available HSL commute times. Activity proposals must fit remaining open
  blocks between 07:00 and 22:00, never overlap busy time or create a booking,
  and always say **Suggested**. At most three are proposed, prioritizing urgent
  reminder review (15 minutes), unfinished Gym (45 minutes), a short walk
  (15 minutes, only with measured steps below target), then focus (25 minutes,
  unless Deep Work is active). These are proposed time budgets, not measured
  durations or new goals. No timed activity is proposed without Calendar access;
  all-day events are busy. Event-location travel is not calculated; missing
  Calendar or transit inputs are disclosed.
- The user-approved commute preferences (home/work stations, work hours and
  walking estimates) stay in the device's preference store. A personal
  Digitransit key stays in device-only iOS Keychain and is removable in setup.
  Only station searches, selected station coordinates and journey times are sent
  to HSL's routing API. Calendar, Reminders and Health are never sent to it.
  HSL metro routing distinguishes live predictions from timetable-only results
  and refreshes every minute while Today is active. It needs a valid API key;
  no journeys are fabricated when HSL is unavailable.
- More/less-time suggestions are rule-based and evidence-limited, not a tracked
  account of how every hour was spent. Planner readings remain in memory,
  separate from the on-device Health coach. There is still no backend or login.

- Home, Steps, Coach, and Settings share a date-aware navigation stack;
  Achievements covers the past year. There is no tab bar, account, or backend.
- **Add weight** beside Morning weight opens an ephemeral kilograms/date/time
  form on compatible iOS builds. Only an explicit **Save to Apple Health**
  requests body-mass write access and saves. It does not authorize other
  manual-entry features, local persistence, or editing/deleting Health samples.
  Its ruler starts at the latest recent Health weigh-in only to position
  itself; that reading is never prefilled or saved.
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
- Gym **Weight** shows the latest morning weigh-in and its distance to an
  optional goal weight, 2W daily or 3M/6M weekly-average morning bars,
  start/now/goal progress, BMI and recent changes, all read from Apple Health.
  The goal is set with − and + and kept on the device; it is not coach input.
  BMI uses the latest Apple Health height and gives no verdict.
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
- Limit manual input and persistence to the explicitly approved exceptions in
  the canonical project policy; displayed Health measurements continue to come
  back through HealthKit.
- Keep every visible measurement and completion state traceable to its source.
- Preserve native navigation, safe areas, and readable, scalable text.
