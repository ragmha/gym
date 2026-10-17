import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export type ThemePreference = 'system' | 'light' | 'dark'

interface ThemeState {
  /** User's explicit preference: follow system, force light, or force dark. */
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  /** Dashboard tile labels in the user's order; unlisted tiles keep default order after them. */
  tileOrder: string[]
  setTileOrder: (tileOrder: string[]) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
      tileOrder: [],
      setTileOrder: (tileOrder) => set({ tileOrder }),
    }),
    {
      name: 'theme-preference',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
