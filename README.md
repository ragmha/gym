# gym

Expo React Native gym tracker with Supabase backend.

## 1) Quick start (5 minutes)

### Prerequisites

- Bun (`bun --version`)
- Node.js (for some Expo tooling)
- Expo Go on phone, or Xcode/Android Studio for simulators

### Install

```bash
bun install
```

### Configure environment

Create `.env.local` with:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-anon-key>
```

### Verify DB connectivity

```bash
bun run db:debug
```

### Run the app

```bash
bun run start
```

Then open with Expo Go (QR), or use:

```bash
bun run ios
bun run android
bun run web
```

## 2) Day-to-day commands

```bash
bun run lint
bun run typecheck
bun run test
```

## 3) Architecture (current branch)

This is how the current `main` architecture works today.

```text
┌────────────────────────────────────────────────────────────────────┐
│                           React Native App                         │
│         Expo Router screens + components in src/app, src/components│
└───────────────────────────────┬────────────────────────────────────┘
                      │
                      │ uses
                      ▼
┌────────────────────────────────────────────────────────────────────┐
│                 Legend State Store (client state)                 │
│                      src/stores/ExerciseStore.ts                  │
│                                                                    │
│ initialize()                                                       │
│  1) SELECT * FROM public.exercises ORDER BY day                    │
│  2) if query fails -> fallback to in-file mock workouts            │
│  3) normalize for UI (selectedSets, localId, color, date)          │
│                                                                    │
│ sync()                                                             │
│  - writes completion back to public.exercises                      │
└───────────────────────────────┬────────────────────────────────────┘
                      │
                      │ Supabase JS client
                      ▼
┌────────────────────────────────────────────────────────────────────┐
│                             Supabase                               │
│  Table: public.exercises (legacy monolithic table)                 │
│  Columns include: day, week, title, videoURL, cardio, exercises[]  │
└────────────────────────────────────────────────────────────────────┘


Realtime path (currently separate):

src/hooks/useRealtimeSync.ts
  └── subscribes to postgres_changes on public.exercises
     └── updates RootStore entries
```

## 4) Database model overview (legacy)

```text
public.exercises
├─ id (uuid)
├─ day (text/int)
├─ week (text/int)
├─ title (text)
├─ videoURL (text)
├─ cardio (jsonb: { morning, evening })
└─ exercises (jsonb array)
  ├─ id
  ├─ title
  ├─ sets (number | "To Failure")
  ├─ reps
  └─ variation
```

## 5) Normalized architecture (feature branch / migration path)

The normalization work is in branch `feat/normalize-db-schema` and PR #13.

```text
workout_days (1) ───────< (many) exercise_definitions
                     │
                     └──────< (many users) user_progress

App read path:
workout_days + exercise_definitions join
    -> zod validation
    -> client transform
    -> Zustand store
```

## 6) Native workflow (CNG)

This project uses Expo Continuous Native Generation (CNG).

- `ios/` and `android/` are generated artifacts and git-ignored.
- Keep native configuration in `app.json` and config plugins.

Regenerate native projects:

```bash
bun run prebuild:clean
```

Full native reset:

```bash
bun run native:reset
```

## 7) Troubleshooting

### Workouts not loading

1. Check env values are present and correct in `.env.local`.
2. Run:

```bash
bun run db:debug
```

3. If you get `404` on `/rest/v1/exercises`, your current project is missing `public.exercises`.
4. Apply [supabase/seed.sql](supabase/seed.sql) in Supabase SQL editor.

### Expo start exits or hangs

- Kill stale Metro processes and restart:

```bash
lsof -ti:8081 | xargs kill -9 2>/dev/null
bun run start
```

### Auth key safety

- `EXPO_PUBLIC_*` values are client-visible by design.
- Never use service-role keys in client/mobile env files.
