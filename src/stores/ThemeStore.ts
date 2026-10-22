import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { DASHBOARD_GOALS } from '@/lib/fitnessMetrics/presenter'
import { commuteSchema, type Commute } from '@/lib/planner'

export type ThemePreference = 'system' | 'light' | 'dark'

interface ThemeState {
  /** User's explicit preference: follow system, force light, or force dark. */
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
  /** Dashboard tile labels in the user's order; unlisted tiles keep default order after them. */
  tileOrder: string[]
  setTileOrder: (tileOrder: string[]) => void
  /** Gym hub tile ids in the user's order. */
  gymTileOrder: string[]
  setGymTileOrder: (gymTileOrder: string[]) => void
  /** Daily food goal in kcal, before workout calories are added back. */
  foodGoalKcal: number
  setFoodGoalKcal: (foodGoalKcal: number) => void
  /** Goal body weight in kg for the Weight screen; never coach input. */
  weightGoalKg: number | null
  setWeightGoalKg: (weightGoalKg: number | null) => void
  commute: Commute | null
  setCommute: (commute: Commute | null) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
      tileOrder: [],
      setTileOrder: (tileOrder) => set({ tileOrder }),
      gymTileOrder: [],
      setGymTileOrder: (gymTileOrder) => set({ gymTileOrder }),
      foodGoalKcal: DASHBOARD_GOALS.dietaryCaloriesGoal,
      setFoodGoalKcal: (foodGoalKcal) => set({ foodGoalKcal }),
      weightGoalKg: null,
      setWeightGoalKg: (weightGoalKg) => set({ weightGoalKg }),
      commute: null,
      setCommute: (commute) =>
        set({
          commute: commute === null ? null : commuteSchema.parse(commute),
        }),
    }),
    {
      name: 'theme-preference',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
