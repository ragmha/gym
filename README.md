# gym

A daily health dashboard built with Expo and React Native. It reads Apple HealthKit on iOS and uses deterministic mock data on other platforms, so health data stays on-device.

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

| Command | Purpose |
| --- | --- |
| `bun run quality:pr` | Run the complete pull-request quality gate |
| `bun run lint` | Check lint and formatting rules |
| `bun run typecheck` | Check TypeScript types |
| `bun run test:unit` | Run unit and component tests |
| `bun run build:web` | Create the static web export |
| `bun run test:phone-rest:swift` | Test the experimental native phone-rest estimator |

## Project map

```text
src/app/                 Expo Router screens
src/components/          UI grouped by domain
src/lib/healthSnapshot/  HealthKit and mock data adapters
src/lib/coach/           On-device and mock coach engines
src/stores/              Persisted theme preference
modules/phone-rest/       Experimental native phone-rest prototype
```

## Troubleshooting

- If Metro hangs, stop it and run `bun run start` again.
- If native dependencies drift, run `bun run prebuild:clean` and rebuild with `bun run ios`.
