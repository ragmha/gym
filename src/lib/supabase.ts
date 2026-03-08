import { createClient } from '@supabase/supabase-js'
import 'expo-sqlite/localStorage/install'

import type { Database } from './database.types'
import { env } from './env'

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL
const supabasePublishableKey = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const isSSR = typeof window === 'undefined'
const safeStorage = isSSR
  ? {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    }
  : localStorage

export const supabase = createClient<Database>(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {
      storage: safeStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
