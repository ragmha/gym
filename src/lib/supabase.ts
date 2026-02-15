import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'
import { env } from './env'

const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL
const supabasePublishableKey = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// SSR-safe storage adapter: AsyncStorage accesses `window` on web,
// which is unavailable during Expo Router's server-side render pass.
const isSSR = typeof window === 'undefined'
const safeStorage = {
  getItem: (key: string) =>
    isSSR ? Promise.resolve(null) : AsyncStorage.getItem(key),
  setItem: (key: string, value: string) =>
    isSSR ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) =>
    isSSR ? Promise.resolve() : AsyncStorage.removeItem(key),
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
