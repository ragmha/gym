import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { PRAYERS, type Prayer } from '@/lib/prayer'

/** On-device prayer checklist. Never written to Health or given to the coach. */
interface PrayerLogState {
  /** Local YYYY-MM-DD → prayers marked that day, in prayer order. */
  prayed: Record<string, Prayer[]>
  toggle: (day: string, prayer: Prayer) => void
}

export const usePrayerLogStore = create<PrayerLogState>()(
  persist(
    (set) => ({
      prayed: {},
      toggle: (day, prayer) =>
        set((state) => {
          const marked = state.prayed[day] ?? []
          const next = PRAYERS.filter((p) =>
            p === prayer ? !marked.includes(p) : marked.includes(p),
          )
          const prayed = { ...state.prayed }
          if (next.length) prayed[day] = next
          else delete prayed[day]
          return { prayed }
        }),
    }),
    {
      name: 'prayer-log',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ prayed }) => ({ prayed }),
    },
  ),
)
