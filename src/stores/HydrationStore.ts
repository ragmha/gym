import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

// ── Types ───────────────────────────────────────────────────────────

export interface HydrationEntry {
  id: string
  date: string // YYYY-MM-DD
  amountMl: number
  timestamp: number // unix ms — when the entry was logged
}

// ── Helpers ─────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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
        const entry: HydrationEntry = {
          id: uuid(),
          date: todayStr(),
          amountMl,
          timestamp: Date.now(),
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
        const today = todayStr()
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
          return e.date >= cutoff.toISOString().slice(0, 10)
        }),
        goalMl: state.goalMl,
        quickAddMl: state.quickAddMl,
      }),
    },
  ),
)

// ── Selector hooks ──────────────────────────────────────────────────

export function useTodayHydration() {
  const today = todayStr()
  const entries = useHydrationStore((s) => s.entries)
  const goalMl = useHydrationStore((s) => s.goalMl)

  const todayEntries = entries.filter((e) => e.date === today)
  const totalMl = todayEntries.reduce((sum, e) => sum + e.amountMl, 0)
  const remainingMl = Math.max(goalMl - totalMl, 0)
  const progress = goalMl > 0 ? Math.min(totalMl / goalMl, 1) : 0

  return { todayEntries, totalMl, remainingMl, goalMl, progress }
}
