# gym

My personal gym app.

## Getting started

You need [Bun](https://bun.sh/), [Node.js](https://nodejs.org/) 20.19.4+, and Xcode for iOS.

Speaking practice lets you shadow a topic script or speak solo for 5 or 15 minutes. Speech is transcribed on-device; optional iOS video can be reviewed, shared, or discarded. On-device post-mortems track progress across sessions and can be reviewed or deleted from Speaking History.

On a paired Apple Watch, **Gym** shows today's lifting day. Pick an exercise and tap the centre of its red set-progress ring to log. Swipe left to adjust reps and kg (they start at the target and your last load; BW is body weight) or **Undo** the last set. Taps go over WatchConnectivity into the iPhone's on-device lifting log, so the iPhone must be reachable. The watch saves nothing itself and writes nothing to Health.

To estimate reps, tap the watch's figure icon (**Count reps**), adjust the motion threshold if needed, and tap **Start**. Get into position within 3 seconds, then hold still for the start tap. It counts vertical wrist-motion cycles and stops about 8 seconds after the last rep; waking the screen also stops the set for review. Stationary-wrist exercises need manual entry or the camera; turn the Digital Crown to correct the estimate before **Log**.

On iOS 17+, **Count** in a Lifting exercise uses the front camera instead: prop the phone with only you in frame, your side visible, and choose Knees, Hips, or Elbows. Adjust the bend threshold to your movement, then **Start counting**. Start straight, bend, and straighten; missing joints or a second person reset the unfinished rep rather than guessing. **Done counting** stops the camera; **Use** fills the editable reps field without logging a set.

Both counters need native build 1.0.18 or later. Frames and motion samples stay in memory, are never saved, and are not Health or coach input. Counts are estimates, not form or safety assessments. The watch uses a `physical-therapy` extended runtime session without Health access; if watchOS rejects or interrupts it, counting stops with an error. Wrist-down behaviour, coexistence with Apple's Workout app, sensor thresholds, and App Review suitability still require real-device/release qualification. Simulators cover builds, UI/error paths, and synthetic detector checks, not live motion/camera accuracy.

The watch's native progress and rep-detector checks run without a simulator:

```bash
swiftc modules/gym-watch/watch/WorkoutState.swift modules/gym-watch/watch/RepDetector.swift modules/gym-watch/Tests/main.swift -o /tmp/gym-watch-check && /tmp/gym-watch-check
```

## Quick start

### Prerequisites

- [Bun](https://bun.sh/) 1.3.5
- Node.js 20.19.4 or newer
- Xcode 26 for iOS development, or a web browser for the web version

### Install

```bash
bun install
bun run ios   # iOS simulator
bun run web   # browser, mock data
```

### Daily rings widget (iOS)

Version 1.0.15 adds a medium Home Screen widget with three rings for Steps,
Water, and Active calories. Its fixed display targets are 20,000 steps, 2.5 L,
and 500 active kcal; these do not change the dashboard's goals or provide
medical recommendations. Missing readings show `--`; recorded zeroes remain
zeroes. Tap the widget to open the dashboard.

This requires a **new native build**, not Expo Go or an OTA to an older binary.
Open today's dashboard, then hold the Home Screen, choose **Edit → Add Widget**,
and search for **gym → Daily rings**. The widget follows the supplied dark
three-ring reference in both system appearances.

The widget shares only today's formatted steps, water, active calories, ring
progress, and update/expiry times through the `group.io.raghib.gym` App Group,
which only the app and its widget extension use. Historical and demo readings are never published. Readings are hidden
after one hour or local midnight, whichever comes first; this is display expiry,
not guaranteed storage deletion. The app does not fetch Health data in the
background.

### Today planner (iOS)

Native version **1.0.20** provides Today as the first Home page; the existing goal
tiles remain on the following pages. Today summarizes measured activity and
on-device logs, then proposes an agenda around Apple Calendar, weekday work
and an optional metro commute. Morning, Afternoon and Night group the plan;
undated, overdue and all-day items stay under Anytime. Suggested activities
fit open gaps and are not Calendar bookings. Secondary readings are expandable.
Apple Reminders supplies tasks, not email.

Calendar and Reminders require **a new iOS 17+ development/native build**, not
an OTA to 1.0.19 or Expo Go. The new Reminders completion boundary and updated
permission-purpose text require this isolated runtime. Tap each Connect action
to request access. Calendar stays read-only. Reminders checkbox taps alone
can complete or uncomplete existing tasks, after native authorization and save
confirmation; there is no creation, deletion or title/date editing. The app
reads eligible incomplete tasks and tasks actually completed today.
Those readings stay in memory on the phone and
never become Health coach context. Web/Android show explicitly unavailable
connections rather than sample events or transit departures.

For metro times, open **Commute setup** and save your own
[Digitransit subscription key](https://portal-api.digitransit.fi/) into the
iPhone's device-only Keychain. Search and select home/work stations, confirm
work hours and walking estimates, then save the local preferences. No key is
bundled in the app or stored in AsyncStorage. Both the key and commute
preferences can be removed in setup. Only station searches, station coordinates
and journey times go to HSL. Routing uses the current HSL v2 API, metro-only,
with walking time; schedules are not claimed to be live predictions.

Work hours use the device's local timezone and Monday–Friday schedule; review
them when travelling or changing work patterns. Suggestions do not write
bookings, estimate travel to calendar event locations, send background alerts,
or infer unmeasured reading, prayer, journaling or screen time.

The planner's native date and reminder-boundary checks run without a simulator:

```bash
swiftc modules/day-planner/ios/PlannerValues.swift modules/day-planner/Tests/main.swift -o /tmp/gym-day-planner-check && /tmp/gym-day-planner-check
```

## Developer evaluations

See [evaluation cases and run instructions](evals/README.md) for synthetic
on-device AI evaluations and evidence-based coding-agent comparisons. They use
the existing development build and Bun/Jest tooling, not a cloud AI service.

## License

[PolyForm Noncommercial 1.0.0](LICENSE.md): free for noncommercial use.
