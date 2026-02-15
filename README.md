# gym

## Native workflow (CNG)

This project uses Expo Continuous Native Generation (CNG).

- `ios/` and `android/` are generated artifacts and are git-ignored.
- Keep native config in `app.json` + plugins.
- Regenerate native projects when needed:

```bash
bun run prebuild:clean
```

- Full native reset (delete + regenerate):

```bash
bun run native:reset
```

## Database debugging

Use the built-in Supabase debug script to verify env setup and database connectivity.

### 1) Configure environment

Set one of these pairs:

- `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (recommended for app + script)
- `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` (accepted by script for CLI-only checks)

Local development usually uses `.env.local`.

### 2) Run the debug check

```bash
bun run db:debug
```

### 3) What the script checks

- Env variables are present and valid
- Supabase auth endpoint is reachable (`/auth/v1/settings`)
- `public.exercises` is accessible via REST
- `exercises` can be queried with `@supabase/supabase-js`

### 4) Common failures

- `HTTP 404` on `/rest/v1/exercises`:
  - The `public.exercises` table likely does not exist in the connected project.
  - Apply [supabase/seed.sql](supabase/seed.sql) in your Supabase SQL editor.
- `HTTP 401/403`:
  - Wrong publishable key, wrong project URL, or table permissions/RLS issues.

### 5) Notes

- `EXPO_PUBLIC_*` values are client-visible by design.
- Never expose service-role keys in client or public env files.
