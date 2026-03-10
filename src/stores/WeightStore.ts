import { supabase } from '@/lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

// ── Types ───────────────────────────────────────────────────────────

export interface WeightEntry {
  id: string
  date: string // YYYY-MM-DD
  weightKg: number
  note: string | null
}

// ── Mock data for demo / offline ────────────────────────────────────

function generateMockEntries(): WeightEntry[] {
  const today = new Date()
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (13 - i))
    const dateStr = d.toISOString().slice(0, 10)
    // Simulate a gradual decrease from ~82 kg to ~80 kg
    const weight = 82.0 - i * 0.15 + (Math.random() - 0.5) * 0.4
    return {
      id: `mock-${dateStr}`,
      date: dateStr,
      weightKg: Math.round(weight * 10) / 10,
      note: null,
    }
  })
}

// ── Store ───────────────────────────────────────────────────────────

interface WeightState {
  entries: WeightEntry[]
  loading: boolean
  error: string | null
  initialized: boolean
  unit: 'kg' | 'lbs'

  initialize: () => Promise<void>
  addEntry: (weightKg: number, date?: string, note?: string) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  setUnit: (unit: 'kg' | 'lbs') => void
}

export const useWeightStoreBase = create<WeightState>()(
  persist(
    (set, get) => ({
      entries: [],
      loading: false,
      error: null,
      initialized: false,
      unit: 'kg',

      initialize: async () => {
        if (get().initialized) return
        set({ loading: true, error: null })

        try {
          const { data, error } = await supabase
            .from('weight_entries')
            .select('*')
            .order('date', { ascending: true })
            .limit(90)

          if (error) {
            // Table likely doesn't exist yet — use mock data
            console.warn(
              '[WeightStore] Supabase error, using mock data:',
              error.message,
            )
            set({ entries: generateMockEntries(), initialized: true })
          } else if (data && data.length > 0) {
            const entries: WeightEntry[] = data.map((row) => ({
              id: row.id as string,
              date: row.date as string,
              weightKg: Number(row.weight_kg),
              note: (row.note as string) ?? null,
            }))
            set({ entries, initialized: true })
          } else {
            // Empty table — seed with mock data for first-time experience
            set({ entries: generateMockEntries(), initialized: true })
          }
        } catch {
          console.warn('[WeightStore] Failed to initialize, using mock data')
          set({ entries: generateMockEntries(), initialized: true })
        } finally {
          set({ loading: false })
        }
      },

      addEntry: async (weightKg, date, note) => {
        const entryDate = date ?? new Date().toISOString().slice(0, 10)
        const tempId = `temp-${Date.now()}`
        const newEntry: WeightEntry = {
          id: tempId,
          date: entryDate,
          weightKg: Math.round(weightKg * 10) / 10,
          note: note ?? null,
        }

        // Optimistic update — insert sorted
        set((state) => {
          const updated = [...state.entries]
          const existingIdx = updated.findIndex((e) => e.date === entryDate)
          if (existingIdx >= 0) {
            updated[existingIdx] = {
              ...updated[existingIdx],
              weightKg: newEntry.weightKg,
              note: newEntry.note,
            }
          } else {
            updated.push(newEntry)
            updated.sort((a, b) => a.date.localeCompare(b.date))
          }
          return { entries: updated }
        })

        try {
          const { data, error } = await supabase
            .from('weight_entries')
            .upsert(
              {
                date: entryDate,
                weight_kg: newEntry.weightKg,
                note: newEntry.note,
              },
              { onConflict: 'date' },
            )
            .select()
            .single()

          if (!error && data) {
            // Replace temp id with real id
            set((state) => ({
              entries: state.entries.map((e) =>
                e.date === entryDate ? { ...e, id: data.id as string } : e,
              ),
            }))
          }
        } catch {
          // Keep optimistic entry; it will sync later
        }
      },

      deleteEntry: async (id) => {
        const entry = get().entries.find((e) => e.id === id)
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        }))

        if (
          entry &&
          !entry.id.startsWith('temp-') &&
          !entry.id.startsWith('mock-')
        ) {
          try {
            await supabase.from('weight_entries').delete().eq('id', id)
          } catch {
            // Restore on failure
            set((state) => {
              const restored = [...state.entries, entry]
              restored.sort((a, b) => a.date.localeCompare(b.date))
              return { entries: restored }
            })
          }
        }
      },

      setUnit: (unit) => set({ unit }),
    }),
    {
      name: 'weight-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ unit: state.unit }),
    },
  ),
)

// ── Convenience hook ────────────────────────────────────────────────

export function useWeightStore() {
  const store = useWeightStoreBase(
    useShallow((state) => ({
      entries: state.entries,
      loading: state.loading,
      error: state.error,
      initialized: state.initialized,
      unit: state.unit,
      initialize: state.initialize,
      addEntry: state.addEntry,
      deleteEntry: state.deleteEntry,
      setUnit: state.setUnit,
    })),
  )

  useEffect(() => {
    store.initialize()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const latestEntry = useMemo(
    () =>
      store.entries.length > 0 ? store.entries[store.entries.length - 1] : null,
    [store.entries],
  )

  const recentEntries = useMemo(() => store.entries.slice(-14), [store.entries])

  const trendDelta = useMemo(() => {
    if (store.entries.length < 2) return null
    const recent = store.entries.slice(-7)
    const older = store.entries.slice(-14, -7)
    if (older.length === 0) return null
    const recentAvg = recent.reduce((s, e) => s + e.weightKg, 0) / recent.length
    const olderAvg = older.reduce((s, e) => s + e.weightKg, 0) / older.length
    return Math.round((recentAvg - olderAvg) * 10) / 10
  }, [store.entries])

  return {
    ...store,
    latestEntry,
    recentEntries,
    trendDelta,
  }
}
