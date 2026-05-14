import { supabase } from '@/lib/supabase'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useMemo } from 'react'
import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

// ── Types ───────────────────────────────────────────────────────────

export type WeightUnit = 'kg' | 'lbs'
export type WeightRangeDays = 7 | 30 | 90
export type WeightGoalStatus = 'no-goal' | 'on-track' | 'off-track' | 'reached'
export type WeightTrendDirection = 'up' | 'down' | 'flat' | null

export interface WeightEntry {
  id: string
  date: string // YYYY-MM-DD
  weightKg: number
  note: string | null
}

export interface WeightTimelinePoint {
  dateKey: string
  weightKg: number
  displayDate: string
  formattedWeight: string
}

export interface WeightTimeline {
  points: WeightTimelinePoint[]
  minKg: number | null
  maxKg: number | null
  axisRange: { lo: number; hi: number }
  average: number | null
  hasData: boolean
}

export interface WeightGoalProgress {
  goalKg: number | null
  latestKg: number | null
  deltaToGoalKg: number | null
  percentToGoal: number | null
  status: WeightGoalStatus
  trendDirection: WeightTrendDirection
  formattedDelta: string | null
}

export interface WeightChartDatum {
  [key: string]: unknown
  index: number
  weight: number
  isFuture: boolean
  isToday: boolean
  dateLabel: string
  formattedWeight: string
}

export interface WeightChartModel {
  chartData: WeightChartDatum[]
  lineData: WeightChartDatum[]
  goalValue: number | null
  yDomain: [number, number]
  todayIndex: number
  firstLabel: string
  todayLabel: string
  lastLabel: string
  lineFirstLabel: string
  lineLastLabel: string
  hasEnoughData: boolean
}

export type WeightValidationResult =
  | { ok: true; weightKg: number }
  | { ok: false; error: 'empty' | 'invalid' | 'out-of-range' }

// ── Constants ───────────────────────────────────────────────────────

export const KG_TO_LBS = 2.20462
export const WEIGHT_TREND_WINDOW_DAYS = 7
export const WEIGHT_GOAL_TOLERANCE_KG = 0.2

const KG_RANGE = { min: 20, max: 500 } as const
const LBS_RANGE = { min: 45, max: 1100 } as const
const numericInputSchema = z.number().finite()

// ── Pure derivations ────────────────────────────────────────────────

export function kgToLbs(kg: number): number {
  return kg * KG_TO_LBS
}

export function lbsToKg(lbs: number): number {
  return lbs / KG_TO_LBS
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10
}

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDateShort(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatWeightValue(kg: number, unit: WeightUnit): string {
  const value = unit === 'lbs' ? kgToLbs(kg) : kg
  return value.toFixed(1)
}

export function formatWeightWithUnit(kg: number, unit: WeightUnit): string {
  return `${formatWeightValue(kg, unit)} ${unit}`
}

export function validateWeightInput(
  rawValue: string,
  unit: WeightUnit,
): WeightValidationResult {
  const trimmed = rawValue.trim()
  if (!trimmed) return { ok: false, error: 'empty' }

  const parsed = Number(trimmed)
  if (!numericInputSchema.safeParse(parsed).success) {
    return { ok: false, error: 'invalid' }
  }

  const range = unit === 'lbs' ? LBS_RANGE : KG_RANGE
  if (parsed < range.min || parsed > range.max) {
    return { ok: false, error: 'out-of-range' }
  }

  return { ok: true, weightKg: unit === 'lbs' ? lbsToKg(parsed) : parsed }
}

export function bucketByDate(
  entries: WeightEntry[],
  rangeDays: WeightRangeDays,
  today = new Date(),
): WeightTimelinePoint[] {
  const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]))
  const start = addDays(today, -(rangeDays - 1))

  return Array.from({ length: rangeDays }, (_, index) => {
    const dateKey = toDateKey(addDays(start, index))
    const entry = entriesByDate.get(dateKey)
    const weightKg = entry?.weightKg ?? 0

    return {
      dateKey,
      weightKg,
      displayDate: formatDateShort(dateKey),
      formattedWeight: weightKg > 0 ? `${weightKg.toFixed(1)} kg` : '--',
    }
  })
}

function calculateTrendDelta(entries: WeightEntry[]): number | null {
  if (entries.length < 2) return null

  const recent = entries.slice(-WEIGHT_TREND_WINDOW_DAYS)
  const older = entries.slice(
    -(WEIGHT_TREND_WINDOW_DAYS * 2),
    -WEIGHT_TREND_WINDOW_DAYS,
  )
  if (older.length === 0) return null

  const recentAvg =
    recent.reduce((sum, entry) => sum + entry.weightKg, 0) / recent.length
  const olderAvg =
    older.reduce((sum, entry) => sum + entry.weightKg, 0) / older.length
  return roundToTenth(recentAvg - olderAvg)
}

function trendDirectionFromDelta(delta: number | null): WeightTrendDirection {
  if (delta === null) return null
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'flat'
}

function buildTimeline(
  entries: WeightEntry[],
  rangeDays: WeightRangeDays,
  unit: WeightUnit,
  today = new Date(),
): WeightTimeline {
  const points = bucketByDate(entries, rangeDays, today).map((point) => ({
    ...point,
    formattedWeight:
      point.weightKg > 0 ? formatWeightWithUnit(point.weightKg, unit) : '--',
  }))
  const weights = points
    .filter((point) => point.weightKg > 0)
    .map((point) => point.weightKg)
  const hasData = weights.length > 0
  const minKg = hasData ? Math.min(...weights) : null
  const maxKg = hasData ? Math.max(...weights) : null
  const average = hasData
    ? roundToTenth(
        weights.reduce((sum, weightKg) => sum + weightKg, 0) / weights.length,
      )
    : null
  const padding =
    minKg !== null && maxKg !== null ? (maxKg - minKg) * 0.15 || 5 : 0

  return {
    points,
    minKg,
    maxKg,
    axisRange: {
      lo: minKg !== null ? Math.max(0, minKg - padding) : 0,
      hi: maxKg !== null ? maxKg + padding : 100,
    },
    average,
    hasData,
  }
}

function buildGoalProgress(
  entries: WeightEntry[],
  goalKg: number | null,
  unit: WeightUnit,
): WeightGoalProgress {
  const latestEntry = entries.length > 0 ? entries[entries.length - 1] : null
  const latestKg = latestEntry?.weightKg ?? null
  const trendDelta = calculateTrendDelta(entries)
  const trendDirection = trendDirectionFromDelta(trendDelta)

  if (goalKg === null) {
    return {
      goalKg,
      latestKg,
      deltaToGoalKg: null,
      percentToGoal: null,
      status: 'no-goal',
      trendDirection,
      formattedDelta: null,
    }
  }

  if (latestKg === null) {
    return {
      goalKg,
      latestKg,
      deltaToGoalKg: null,
      percentToGoal: 0,
      status: 'off-track',
      trendDirection,
      formattedDelta: null,
    }
  }

  const deltaToGoalKg = roundToTenth(latestKg - goalKg)
  const absDeltaKg = Math.abs(deltaToGoalKg)
  const reached = absDeltaKg <= WEIGHT_GOAL_TOLERANCE_KG
  const needsDownwardTrend = latestKg > goalKg
  const trendTowardGoal = needsDownwardTrend
    ? trendDirection === 'down'
    : trendDirection === 'up'

  const percentToGoal = reached
    ? 100
    : Math.max(
        0,
        Math.min(
          100,
          roundToTenth((1 - absDeltaKg / Math.max(goalKg, latestKg)) * 100),
        ),
      )

  return {
    goalKg,
    latestKg,
    deltaToGoalKg,
    percentToGoal,
    status: reached ? 'reached' : trendTowardGoal ? 'on-track' : 'off-track',
    trendDirection,
    formattedDelta: `${formatWeightValue(absDeltaKg, unit)} ${unit}`,
  }
}

function buildChartModel(
  entries: WeightEntry[],
  goalKg: number | null,
  unit: WeightUnit,
  today = new Date(),
): WeightChartModel {
  const pastDays = 30
  const futureDays = 7
  const chartEntries = entries.slice(-pastDays)
  const todayKey = toDateKey(today)
  const pastPoints = bucketByDate(chartEntries, pastDays, today)
  const futurePoints = Array.from({ length: futureDays }, (_, index) => {
    const dateKey = toDateKey(addDays(today, index + 1))
    return {
      dateKey,
      weightKg: 0,
      displayDate: formatDateShort(dateKey),
      formattedWeight: '--',
    }
  })

  const chartData: WeightChartDatum[] = [...pastPoints, ...futurePoints].map(
    (point, index) => ({
      index,
      weight:
        point.weightKg > 0
          ? unit === 'lbs'
            ? kgToLbs(point.weightKg)
            : point.weightKg
          : 0,
      isFuture: index >= pastDays,
      isToday: point.dateKey === todayKey,
      dateLabel: point.displayDate,
      formattedWeight:
        point.weightKg > 0 ? formatWeightWithUnit(point.weightKg, unit) : '--',
    }),
  )

  const lineData: WeightChartDatum[] = chartEntries
    .filter((entry) => entry.weightKg > 0)
    .map((entry, index) => ({
      index,
      weight: unit === 'lbs' ? kgToLbs(entry.weightKg) : entry.weightKg,
      isFuture: false,
      isToday: entry.date === todayKey,
      dateLabel: formatDateShort(entry.date),
      formattedWeight: formatWeightWithUnit(entry.weightKg, unit),
    }))

  const goalValue =
    goalKg !== null ? (unit === 'lbs' ? kgToLbs(goalKg) : goalKg) : null
  const weights = chartEntries
    .filter((entry) => entry.weightKg > 0)
    .map((entry) => (unit === 'lbs' ? kgToLbs(entry.weightKg) : entry.weightKg))
  const allValues = goalValue !== null ? [...weights, goalValue] : weights
  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 100
  const padding = (maxValue - minValue) * 0.15 || 5
  const todayIndex = chartData.findIndex((datum) => datum.isToday)
  const todayItem = chartData.find((datum) => datum.isToday)

  return {
    chartData,
    lineData,
    goalValue,
    yDomain: [Math.max(0, minValue - padding), maxValue + padding],
    todayIndex,
    firstLabel: chartData[0]?.dateLabel ?? '',
    todayLabel: todayItem?.dateLabel ?? '',
    lastLabel: chartData[chartData.length - 1]?.dateLabel ?? '',
    lineFirstLabel: lineData[0]?.dateLabel ?? '',
    lineLastLabel: lineData[lineData.length - 1]?.dateLabel ?? '',
    hasEnoughData: chartEntries.length >= 2,
  }
}

// ── Mock data for demo / offline ────────────────────────────────────

function generateMockEntries(): WeightEntry[] {
  const today = new Date()
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (13 - i))
    const dateStr = d.toISOString().slice(0, 10)
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
  unit: WeightUnit
  goalKg: number | null

  initialize: () => Promise<void>
  addEntry: (weightKg: number, date?: string, note?: string) => Promise<void>
  deleteEntry: (id: string) => Promise<void>
  setUnit: (unit: WeightUnit) => void
  setGoal: (kg: number | null) => void
}

export const useWeightStoreBase = create<WeightState>()(
  persist(
    (set, get) => ({
      entries: [],
      loading: false,
      error: null,
      initialized: false,
      unit: 'kg',
      goalKg: null,

      initialize: async () => {
        if (get().initialized) return
        set({ loading: true, error: null })

        try {
          // Supabase is a remote-owned dependency. A future port seam could live
          // here if a second adapter appears; today the inline fallback is enough.
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
        const entryDate = date ?? toDateKey(new Date())
        const tempId = `temp-${Date.now()}`
        const newEntry: WeightEntry = {
          id: tempId,
          date: entryDate,
          weightKg: roundToTenth(weightKg),
          note: note ?? null,
        }

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
            set((state) => {
              const restored = [...state.entries, entry]
              restored.sort((a, b) => a.date.localeCompare(b.date))
              return { entries: restored }
            })
          }
        }
      },

      setUnit: (unit) => set({ unit }),

      setGoal: (kg) =>
        set({
          goalKg: kg !== null && (!Number.isFinite(kg) || kg <= 0) ? null : kg,
        }),
    }),
    {
      name: 'weight-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ unit: state.unit, goalKg: state.goalKg }),
    },
  ),
)

// ── Convenience hooks ───────────────────────────────────────────────

export function useWeightTimeline({
  rangeDays,
}: {
  rangeDays: WeightRangeDays
}): WeightTimeline {
  const { entries, unit } = useWeightStoreBase(
    useShallow((state) => ({ entries: state.entries, unit: state.unit })),
  )

  return useMemo(
    () => buildTimeline(entries, rangeDays, unit),
    [entries, rangeDays, unit],
  )
}

export function useWeightGoalProgress(): WeightGoalProgress {
  const { entries, goalKg, unit } = useWeightStoreBase(
    useShallow((state) => ({
      entries: state.entries,
      goalKg: state.goalKg,
      unit: state.unit,
    })),
  )

  return useMemo(
    () => buildGoalProgress(entries, goalKg, unit),
    [entries, goalKg, unit],
  )
}

export function useWeightChartModel(): WeightChartModel {
  const { entries, goalKg, unit } = useWeightStoreBase(
    useShallow((state) => ({
      entries: state.entries,
      goalKg: state.goalKg,
      unit: state.unit,
    })),
  )

  return useMemo(
    () => buildChartModel(entries, goalKg, unit),
    [entries, goalKg, unit],
  )
}

export function useWeightStore() {
  const store = useWeightStoreBase(
    useShallow((state) => ({
      entries: state.entries,
      loading: state.loading,
      error: state.error,
      initialized: state.initialized,
      unit: state.unit,
      goalKg: state.goalKg,
      initialize: state.initialize,
      addEntry: state.addEntry,
      deleteEntry: state.deleteEntry,
      setUnit: state.setUnit,
      setGoal: state.setGoal,
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

  const recentEntries = useMemo(() => store.entries.slice(-30), [store.entries])
  const trendDelta = useMemo(
    () => calculateTrendDelta(store.entries),
    [store.entries],
  )

  const distanceToGoal = useMemo(() => {
    if (store.goalKg === null || !latestEntry) return null
    return roundToTenth(latestEntry.weightKg - store.goalKg)
  }, [store.goalKg, latestEntry])

  const isOnTrack = useMemo(() => {
    if (store.goalKg === null || trendDelta === null) return null
    const needToLose = latestEntry ? latestEntry.weightKg > store.goalKg : false
    if (needToLose) return trendDelta < 0
    return trendDelta > 0
  }, [store.goalKg, trendDelta, latestEntry])

  return {
    ...store,
    latestEntry,
    recentEntries,
    trendDelta,
    distanceToGoal,
    isOnTrack,
  }
}
