import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'

import { offlineFirstQuery } from '@/lib/offlineFirstQuery/OfflineFirstQuery'
import { supabase } from '@/lib/supabase'
import {
  parseMealRows,
  type MealInsert,
  type MealRow,
  type MealUpdate,
  type MealSource,
} from '@/lib/validators'

// Until `meals` is added to the generated database.types.ts (after running
// `bun run generate-types` against a remote DB with the meals migration
// applied), we work through an untyped accessor for that table only.
function mealsTable() {
  return (supabase.from as any)('meals')
}

// ── Types ───────────────────────────────────────────────────────────

export interface Meal {
  id: string
  date: string // YYYY-MM-DD
  consumedAt: string // ISO
  name: string
  caloriesKcal: number
  proteinG: number
  carbG: number
  fatG: number
  source: MealSource
  photoUri: string | null
  barcode: string | null
  aiConfidence: number | null
  /** True when this meal exists only locally and hasn't been persisted yet. */
  pending: boolean
}

export interface DailyTargets {
  caloriesKcal: number
  proteinG: number
  carbG: number
  fatG: number
}

const DEFAULT_TARGETS: DailyTargets = {
  caloriesKcal: 2200,
  proteinG: 150,
  carbG: 250,
  fatG: 70,
}

// ── Helpers ─────────────────────────────────────────────────────────

function todayStr(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function rowToMeal(row: MealRow): Meal {
  return {
    id: row.id,
    date: row.date,
    consumedAt: row.consumed_at,
    name: row.name,
    caloriesKcal: row.calories_kcal,
    proteinG: row.protein_g,
    carbG: row.carb_g,
    fatG: row.fat_g,
    source: row.source,
    photoUri: row.photo_url ?? null,
    barcode: row.barcode ?? null,
    aiConfidence: row.ai_confidence ?? null,
    pending: false,
  }
}

function mealToInsert(meal: Meal): MealInsert {
  return {
    date: meal.date,
    consumed_at: meal.consumedAt,
    name: meal.name,
    calories_kcal: meal.caloriesKcal,
    protein_g: meal.proteinG,
    carb_g: meal.carbG,
    fat_g: meal.fatG,
    source: meal.source,
    photo_url: meal.photoUri ?? undefined,
    barcode: meal.barcode ?? undefined,
    ai_confidence: meal.aiConfidence ?? undefined,
  }
}

// ── Store ───────────────────────────────────────────────────────────

export type AddMealInput = {
  name: string
  caloriesKcal: number
  proteinG: number
  carbG: number
  fatG: number
  source: MealSource
  photoUri?: string | null
  barcode?: string | null
  aiConfidence?: number | null
  date?: string
  consumedAt?: string
}

interface MealState {
  meals: Meal[]
  loading: boolean
  error: string | null
  initialized: boolean
  targets: DailyTargets

  initialize: () => Promise<void>
  addMeal: (input: AddMealInput) => Promise<Meal>
  updateMeal: (id: string, patch: Partial<AddMealInput>) => Promise<void>
  deleteMeal: (id: string) => Promise<void>
  setTargets: (targets: Partial<DailyTargets>) => void
}

export const useMealStoreBase = create<MealState>()(
  persist(
    (set, get) => ({
      meals: [],
      loading: false,
      error: null,
      initialized: false,
      targets: DEFAULT_TARGETS,

      initialize: async () => {
        if (get().initialized) return
        set({ loading: true, error: null })
        try {
          const result = await offlineFirstQuery({
            query: async () =>
              await mealsTable()
                .select('*')
                .order('consumed_at', { ascending: false })
                .limit(180),
            fallback: () => [] as Meal[],
            parse: (rows) => parseMealRows(rows).map(rowToMeal),
          })

          if (result.usedFallback && result.error) {
            console.warn(
              '[MealStore] Supabase error, starting empty:',
              result.error.message,
            )
          }

          // Merge persisted-but-pending meals (still on the device only) with
          // the canonical server set so optimistic adds aren't dropped.
          const pending = get().meals.filter((m) => m.pending)
          const serverIds = new Set(result.data.map((m) => m.id))
          const combined = [
            ...pending.filter((m) => !serverIds.has(m.id)),
            ...result.data,
          ]

          set({ meals: combined, initialized: true })
        } catch (error) {
          console.warn(
            '[MealStore] Failed to initialize:',
            error instanceof Error ? error.message : 'Unknown error',
          )
          set({ initialized: true })
        } finally {
          set({ loading: false })
        }
      },

      addMeal: async (input: AddMealInput) => {
        const tempId = uuidv4()
        const now = new Date()
        const meal: Meal = {
          id: tempId,
          date: input.date ?? todayStr(now),
          consumedAt: input.consumedAt ?? now.toISOString(),
          name: input.name,
          caloriesKcal: input.caloriesKcal,
          proteinG: input.proteinG,
          carbG: input.carbG,
          fatG: input.fatG,
          source: input.source,
          photoUri: input.photoUri ?? null,
          barcode: input.barcode ?? null,
          aiConfidence: input.aiConfidence ?? null,
          pending: true,
        }

        // Optimistic insert.
        set((state) => ({ meals: [meal, ...state.meals] }))

        try {
          const { data, error } = await mealsTable()
            .insert(mealToInsert(meal))
            .select()
            .single()

          if (!error && data) {
            const persisted = rowToMeal(data as MealRow)
            set((state) => ({
              meals: state.meals.map((m) => (m.id === tempId ? persisted : m)),
            }))
            return persisted
          }
        } catch {
          // Keep the optimistic entry; the next initialize() will reconcile.
        }
        return meal
      },

      updateMeal: async (id: string, patch: Partial<AddMealInput>) => {
        const before = get().meals.find((m) => m.id === id)
        if (!before) return

        const merged: Meal = {
          ...before,
          name: patch.name ?? before.name,
          caloriesKcal: patch.caloriesKcal ?? before.caloriesKcal,
          proteinG: patch.proteinG ?? before.proteinG,
          carbG: patch.carbG ?? before.carbG,
          fatG: patch.fatG ?? before.fatG,
          source: patch.source ?? before.source,
          photoUri: patch.photoUri ?? before.photoUri,
          barcode: patch.barcode ?? before.barcode,
          aiConfidence: patch.aiConfidence ?? before.aiConfidence,
          date: patch.date ?? before.date,
          consumedAt: patch.consumedAt ?? before.consumedAt,
        }

        set((state) => ({
          meals: state.meals.map((m) => (m.id === id ? merged : m)),
        }))

        if (before.pending) return // Nothing on the server to update yet.

        const update: MealUpdate = mealToInsert(merged)
        try {
          await mealsTable().update(update).eq('id', id)
        } catch {
          // Revert on failure.
          set((state) => ({
            meals: state.meals.map((m) => (m.id === id ? before : m)),
          }))
        }
      },

      deleteMeal: async (id: string) => {
        const before = get().meals.find((m) => m.id === id)
        if (!before) return

        set((state) => ({
          meals: state.meals.filter((m) => m.id !== id),
        }))

        if (before.pending) return

        try {
          await mealsTable().delete().eq('id', id)
        } catch {
          set((state) => ({
            meals: [before, ...state.meals],
          }))
        }
      },

      setTargets: (targets: Partial<DailyTargets>) =>
        set((state) => ({ targets: { ...state.targets, ...targets } })),
    }),
    {
      name: 'meal-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        targets: state.targets,
        // Persist pending (offline) meals so they survive an app restart and
        // can be reconciled on next initialize().
        meals: state.meals.filter((m) => m.pending),
      }),
    },
  ),
)

// ── Convenience hooks ───────────────────────────────────────────────

export interface DailyNutrition {
  date: string
  meals: Meal[]
  totals: {
    caloriesKcal: number
    proteinG: number
    carbG: number
    fatG: number
  }
  remaining: {
    caloriesKcal: number
    proteinG: number
    carbG: number
    fatG: number
  }
  progress: {
    calories: number // 0..1+
    protein: number
    carb: number
    fat: number
  }
  targets: DailyTargets
}

/**
 * Aggregated daily nutrition state — totals, progress vs targets,
 * and the meals consumed today. Memoised against (meals, targets, date).
 */
export function useDailyNutrition(date?: string): DailyNutrition {
  const day = date ?? todayStr()
  const meals = useMealStoreBase((s) => s.meals)
  const targets = useMealStoreBase((s) => s.targets)

  return useMemo(() => {
    const todays = meals.filter((m) => m.date === day)
    const totals = todays.reduce(
      (acc, m) => ({
        caloriesKcal: acc.caloriesKcal + m.caloriesKcal,
        proteinG: acc.proteinG + m.proteinG,
        carbG: acc.carbG + m.carbG,
        fatG: acc.fatG + m.fatG,
      }),
      { caloriesKcal: 0, proteinG: 0, carbG: 0, fatG: 0 },
    )

    const ratio = (used: number, target: number) =>
      target > 0 ? used / target : 0

    return {
      date: day,
      meals: todays.sort((a, b) => b.consumedAt.localeCompare(a.consumedAt)),
      totals,
      remaining: {
        caloriesKcal: Math.max(targets.caloriesKcal - totals.caloriesKcal, 0),
        proteinG: Math.max(targets.proteinG - totals.proteinG, 0),
        carbG: Math.max(targets.carbG - totals.carbG, 0),
        fatG: Math.max(targets.fatG - totals.fatG, 0),
      },
      progress: {
        calories: ratio(totals.caloriesKcal, targets.caloriesKcal),
        protein: ratio(totals.proteinG, targets.proteinG),
        carb: ratio(totals.carbG, targets.carbG),
        fat: ratio(totals.fatG, targets.fatG),
      },
      targets,
    }
  }, [meals, targets, day])
}

/** Full store hook with auto-init. */
export function useMealStore() {
  const store = useMealStoreBase(
    useShallow((state) => ({
      meals: state.meals,
      loading: state.loading,
      error: state.error,
      initialized: state.initialized,
      targets: state.targets,
      initialize: state.initialize,
      addMeal: state.addMeal,
      updateMeal: state.updateMeal,
      deleteMeal: state.deleteMeal,
      setTargets: state.setTargets,
    })),
  )

  useEffect(() => {
    store.initialize()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return store
}
