# gym

A daily health dashboard built with Expo and React Native. It reads Apple HealthKit on iOS and uses deterministic mock data on other platforms, so health data stays on-device.

The home grid has seven blocks: Steps, Gym, Water, Reading, Praying, Journal, and Speaking. It keeps the existing clean outline SVG icons inside thick, rounded tiles. Gym uses the dumbbell icon and combines three equally weighted goals: a 30-minute run, a recorded strength workout, and a morning weigh-in. Partial running time contributes proportionally, but Gym is complete only when all three goals are met. Missing subgoals earn no progress and remain unavailable, not invented zero readings; when all three are missing, Gym stays unfilled. The daily summary counts Steps and Gym as two goals. Tapping Gym opens a 2×2 hub for Stairmaster, Cardio, Lifting, and Weight, each with its own detail screen.

Real goal progress fills each tile upward in muted red; a completed goal becomes solid red with a dark icon and a short, non-looping bounce. Labels and readings sit below the tiles. Dark mode uses a black canvas, and light mode keeps the same layout with a light palette. Water has no invented hydration target. Reading (Apple Books), Praying (Athan), and Journal (Bear's Today list) remain neutral links: the app never reads or infers their progress, and they don't count toward goals. Speaking remains a disabled placeholder. Hold any Home or Gym tile to rearrange: tiles wiggle until you tap Done, VoiceOver offers Move earlier/later, and Settings → Layout resets the order. There are no timers or play/pause controls. These states reflect goals, not health assessments, and Reduced Motion disables the animation. Tapping Water opens a bottle and 28-day history from Apple Health; days with no reading are shown separately from a recorded 0 L. On compatible iOS builds, +/− adjusts an unsaved amount in 250 mL steps, and an explicit save adds a new Dietary Water sample to Apple Health for today without changing existing samples.

The header shows the date, goal-progress ring, and **Settings** in one row; tap the ring to refresh readings. The dashboard fits six tiles per page in a 2-by-3 grid without vertical scrolling. The icon-only footer places **Insights** on the left, page dots in the centre, and **Chat** on the right. Swipe horizontally or tap the dots for the remaining tiles and **Achievements** (badges and personal records from the past year). Tiles retain their icons and primary readings, with fuller descriptions in accessibility labels and detail screens. Health access remains available in Settings. Insights opens the calendar for past days: selecting a day returns to that day's dashboard, and **View today** returns to the current day. Insights does not calculate multi-day goal summaries.

Stairmaster's **Your highlights** summarises all readable completed stair sessions through today, independently of the selected calendar date: longest streak with its date range, usual local start-time window, best month, and total sessions/time. The dashboard includes monthly goal-day bars for the last 12 months (including the current partial month) and an all-time start-time histogram; both expose their values to screen readers. A streak or best-month day requires at least one session lasting 30 minutes; multiple shorter sessions do not combine, and multiple qualifying sessions count as one day. Streaks use consecutive local dates without a 30-day cap. Equal streak/month records show the most recent; start times use half-hour windows, require at least two starts in a window, and show the earliest window on a labelled tie. These are descriptive records, not training recommendations. Highlights are derived in memory without persistence, extra Health permissions, or coach input; unavailable history is not shown as zero, and web/Android highlights are labelled demo data.

## Quick start

### Prerequisites

- [Bun](https://bun.sh/) 1.3.5
- Node.js 20.19.4 or newer
- Xcode 26 for iOS development, or a web browser for the web version

### Install

```bash
bun install
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

[PolyForm Noncommercial 1.0.0](LICENSE.md). Free for personal, hobby, research,
and other noncommercial use. Commercial use needs a separate license from the
copyright holder — open an issue to ask.
