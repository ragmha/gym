# gym

My personal gym app.

## Getting started

You need [Bun](https://bun.sh/), [Node.js](https://nodejs.org/) 20.19.4+, and Xcode for iOS.

Speaking practice lets you shadow a topic script or speak solo for 5 or 15 minutes. Speech is transcribed on-device; optional iOS video can be reviewed, shared, or discarded. On-device post-mortems track progress across sessions and can be reviewed or deleted from Speaking History.

On a paired Apple Watch, **Gym** shows today's lifting day. Pick an exercise and tap the centre of its red set-progress ring to log. Swipe left to adjust reps and kg (they start at the target and your last load; BW is body weight) or **Undo** the last set. Taps go over WatchConnectivity into the iPhone's on-device lifting log, so the iPhone must be reachable. The watch saves nothing itself and writes nothing to Health.

The watch's native progress check runs without a simulator:

```bash
swiftc modules/gym-watch/watch/WorkoutState.swift modules/gym-watch/Tests/main.swift -o /tmp/gym-watch-check && /tmp/gym-watch-check
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

No environment variables, backend, or API keys are required.

### Run

```bash
bun run ios     # Build and run in the iOS simulator
bun run web     # Open the web version with mock health data
bun run start   # Start Expo for an installed development build
```

On iOS, open **Settings → Connect / Review Health access** after launch. The dashboard reads existing Apple Health data; unavailable measurements remain blank.

Non-iOS platforms use deterministic mock health data. The coach uses Apple Foundation Models on supported iOS devices and a deterministic mock elsewhere.

### Daily rings widget (iOS)

Version 1.0.11 adds a medium Home Screen widget with three rings for Steps,
Water, and Active calories. Its fixed display targets are 20,000 steps, 2.5 L,
and 500 active kcal; these do not change the dashboard's goals or provide
medical recommendations. Missing readings show `--`; recorded zeroes remain
zeroes. Tap the widget to open the dashboard.

This requires a **new native build**, not Expo Go or an OTA to an older binary.
Open today's dashboard, then hold the Home Screen, choose **Edit → Add Widget**,
and search for **gym → Daily rings**. The widget follows the supplied dark
three-ring reference in both system appearances.

The user-approved widget-only storage exception shares only formatted steps,
water, active calories, ring progress, and update/expiry times with the
`group.io.raghib.gym.widgets` App Group using Expo Widgets' local timeline
storage. No Health history, new Zustand store, backend, Health writes, or coach
input is added. The last timeline is overwritten on each successful current-day
dashboard read, or replaced with unavailable readings on a read error. Historical
days and demo readings never publish. A scheduled blank entry hides readings
after one hour or local midnight, whichever comes first. This is display expiry,
not guaranteed deletion from the shared container; iOS schedules redraws and the
app does not fetch Health data in the background.

## Useful commands

| Command                         | Purpose                                           |
| ------------------------------- | ------------------------------------------------- |
| `bun run quality:pr`            | Run the complete pull-request quality gate        |
| `bun run lint`                  | Check lint and formatting rules                   |
| `bun run typecheck`             | Check TypeScript types                            |
| `bun run test:unit`             | Run unit and component tests                      |
| `bun run build:web`             | Create the static web export                      |
| `bun run test:phone-rest:swift` | Test the experimental native phone-rest estimator |

## Project map

```text
src/app/                 Expo Router screens
src/components/          UI grouped by domain
src/lib/healthSnapshot/  HealthKit and mock data adapters
src/lib/coach/           On-device and mock coach engines
src/lib/gymProgramme/    Bundled 8-week lifting programme
src/stores/              Persisted theme, Home/Gym tile order and on-device gym log
modules/phone-rest/       Experimental native phone-rest prototype
```

## Troubleshooting

- If Metro hangs, stop it and run `bun run start` again.
- If native dependencies drift, run `bun run prebuild:clean` and rebuild with `bun run ios`.

## License

[PolyForm Noncommercial 1.0.0](LICENSE.md): free for noncommercial use.
