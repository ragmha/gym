import { resolveSupabaseEnv } from './supabaseEnv'

const { url, key } = resolveSupabaseEnv(process.env)

export const env = {
  EXPO_PUBLIC_SUPABASE_URL: url,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
}
