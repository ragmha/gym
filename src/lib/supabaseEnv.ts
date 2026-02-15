import { z } from 'zod'

export type SupabaseEnvSource =
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
  | 'SUPABASE_PUBLISHABLE_KEY'

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().trim().url().optional(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1).optional(),
  SUPABASE_URL: z.string().trim().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1).optional(),
})

type ResolveSupabaseEnvOptions = {
  allowCliVariables?: boolean
}

export function resolveSupabaseEnv(
  inputEnv: NodeJS.ProcessEnv,
  options: ResolveSupabaseEnvOptions = {},
) {
  const parsed = envSchema.safeParse(inputEnv)

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('; ')
    throw new Error(`Invalid Supabase environment values: ${message}`)
  }

  const env = parsed.data
  const allowCliVariables = options.allowCliVariables ?? false

  const urlSource: SupabaseEnvSource | null = env.EXPO_PUBLIC_SUPABASE_URL
    ? 'EXPO_PUBLIC_SUPABASE_URL'
    : allowCliVariables && env.SUPABASE_URL
      ? 'SUPABASE_URL'
      : null

  const keySource: SupabaseEnvSource | null =
    env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ? 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
      : allowCliVariables && env.SUPABASE_PUBLISHABLE_KEY
        ? 'SUPABASE_PUBLISHABLE_KEY'
        : null

  const url = allowCliVariables
    ? (env.EXPO_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL)
    : env.EXPO_PUBLIC_SUPABASE_URL

  const key = allowCliVariables
    ? (env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY)
    : env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !key || !urlSource || !keySource) {
    throw new Error(
      allowCliVariables
        ? 'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or SUPABASE_URL + SUPABASE_PUBLISHABLE_KEY for CLI checks).'
        : 'Missing Supabase env vars. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
    )
  }

  return { url, key, urlSource, keySource }
}
