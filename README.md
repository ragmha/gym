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

## License

[PolyForm Noncommercial 1.0.0](LICENSE.md): free for noncommercial use.
