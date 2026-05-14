import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

// ── Types ───────────────────────────────────────────────────────────

export interface HydrationEntry {
  id: string
  date: string // YYYY-MM-DD
  amountMl: number
  timestamp: number // unix ms — when the entry was logged
}

// ── Helpers ─────────────────────────────────────────────────────────

export type HydrationStatus = 'empty' | 'progress' | 'reached'

export interface DailyHydrationSummary {
  todayEntries: HydrationEntry[]
  totalMl: number
  remainingMl: number
  goalMl: number
  progress: number
  percentOfGoal: number
  goalReached: boolean
  status: HydrationStatus
  formattedTotal: string
  formattedRemaining: string
}

export function getLocalDayKey(now = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createDailyHydrationSummary(
  entries: HydrationEntry[],
  goalMl: number,
  dayKey = getLocalDayKey(),
): DailyHydrationSummary {
  const today = dayKey
  const todayEntries = entries.filter((entry) => entry.date === today)
  const totalMl = todayEntries.reduce((sum, entry) => sum + entry.amountMl, 0)
  const remainingMl = Math.max(goalMl - totalMl, 0)
  const progress = goalMl > 0 ? Math.min(totalMl / goalMl, 1) : 0
  const percentOfGoal = goalMl > 0 ? Math.min((totalMl / goalMl) * 100, 100) : 0
  const goalReached = goalMl > 0 && totalMl >= goalMl
  const status: HydrationStatus =
    totalMl === 0 ? 'empty' : goalReached ? 'reached' : 'progress'

  return {
    todayEntries,
    totalMl,
    remainingMl,
    goalMl,
    progress,
    percentOfGoal,
    goalReached,
    status,
    formattedTotal: totalMl.toLocaleString(),
    formattedRemaining: remainingMl.toLocaleString(),
  }
}

// ── Store ───────────────────────────────────────────────────────────

interface HydrationState {
  entries: HydrationEntry[]
  goalMl: number
  quickAddMl: number

  // Derived (computed in hook)
  // todayTotal, remaining

  addEntry: (amountMl: number) => void
  removeEntry: (id: string) => void
  setGoal: (ml: number) => void
  setQuickAdd: (ml: number) => void
  clearToday: () => void
}

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set, _get) => ({
      entries: [],
      goalMl: 2000,
      quickAddMl: 500,

      addEntry: (amountMl: number) => {
        const now = new Date()
        const entry: HydrationEntry = {
          id: uuid(),
          date: getLocalDayKey(now),
          amountMl,
          timestamp: now.getTime(),
        }
        set((s) => ({ entries: [...s.entries, entry] }))
      },

      removeEntry: (id: string) => {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }))
      },

      setGoal: (ml: number) => {
        set({ goalMl: ml })
      },

      setQuickAdd: (ml: number) => {
        set({ quickAddMl: ml })
      },

      clearToday: () => {
        const today = getLocalDayKey()
        set((s) => ({ entries: s.entries.filter((e) => e.date !== today) }))
      },
    }),
    {
      name: 'hydration-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the last 90 days of entries + settings
      partialize: (state) => ({
        entries: state.entries.filter((e) => {
          const cutoff = new Date()
          cutoff.setDate(cutoff.getDate() - 90)
          return e.date >= getLocalDayKey(cutoff)
        }),
        goalMl: state.goalMl,
        quickAddMl: state.quickAddMl,
      }),
    },
  ),
)

// ── Selector hooks ──────────────────────────────────────────────────

export function useDailyHydration() {
  const { entries, goalMl } = useHydrationStore(
    useShallow((state) => ({ entries: state.entries, goalMl: state.goalMl })),
  )
  const today = getLocalDayKey()

  return useMemo(
    () => createDailyHydrationSummary(entries, goalMl, today),
    [entries, goalMl, today],
  )
}

export function useTodayHydration() {
  return useDailyHydration()
}
