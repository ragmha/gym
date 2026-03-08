import { resolveSupabaseEnv } from './supabaseEnv'

let url = ''
let key = ''

try {
  const resolved = resolveSupabaseEnv(process.env)
  url = resolved.url
  key = resolved.key
} catch (error) {
  // In development, missing env vars should warn, not crash the app.
  // This allows tests and non-Supabase flows to proceed.
  if (__DEV__) {
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
