import { resolveSupabaseEnv } from './supabaseEnv'

// IMPORTANT: babel-preset-expo only inlines `EXPO_PUBLIC_*` env vars at
// literal `process.env.EXPO_PUBLIC_NAME` member-access sites. Passing
// `process.env` to a helper (or destructuring it) leaves the values as
// `undefined` in production bundles, which crashes `createClient('', '')`
// at startup. Read each var directly here so Babel can replace it.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

if (__DEV__) {
  try {
    resolveSupabaseEnv({
      ...process.env,
      EXPO_PUBLIC_SUPABASE_URL: url,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
    })
  } catch (error) {
    console.warn(
      '[env] Supabase env vars missing — Supabase features will be unavailable.',
      error instanceof Error ? error.message : error,
    )
  }
}

export const env = {
  EXPO_PUBLIC_SUPABASE_URL: url,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
}
