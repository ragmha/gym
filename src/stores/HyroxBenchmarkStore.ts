import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMemo } from 'react'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'

import type { HyroxStation } from '@/lib/training/hyrox'

export interface HyroxBenchmark {
  id: string
  station: HyroxStation
  timeSeconds: number
  weightKg: number | null
  recordedAt: string // ISO timestamp
  note: string | null
}

interface HyroxState {
  benchmarks: HyroxBenchmark[]
  addBenchmark: (input: {
    station: HyroxStation
    timeSeconds: number
    weightKg?: number | null
    note?: string | null
    recordedAt?: string
  }) => HyroxBenchmark
  removeBenchmark: (id: string) => void
  clearAll: () => void
}

function uuid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export const useHyroxBenchmarkStoreBase = create<HyroxState>()(
  persist(
    (set) => ({
      benchmarks: [],

      addBenchmark: ({ station, timeSeconds, weightKg, note, recordedAt }) => {
        const entry: HyroxBenchmark = {
          id: uuid(),
          station,
          timeSeconds: Math.max(0, Math.round(timeSeconds)),
          weightKg: weightKg ?? null,
          recordedAt: recordedAt ?? new Date().toISOString(),
          note: note ?? null,
        }
        set((s) => ({
          benchmarks: [entry, ...s.benchmarks].sort(
            (a, b) =>
              new Date(b.recordedAt).getTime() -
              new Date(a.recordedAt).getTime(),
          ),
        }))
        return entry
      },

      removeBenchmark: (id) => {
        set((s) => ({ benchmarks: s.benchmarks.filter((b) => b.id !== id) }))
      },

      clearAll: () => set({ benchmarks: [] }),
    }),
    {
      name: 'hyrox-benchmarks',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ benchmarks: s.benchmarks.slice(0, 200) }),
    },
  ),
)

export const useHyroxBenchmarkStore = useHyroxBenchmarkStoreBase

// ── Pure selectors (also usable directly in tests) ───────────────────

export function getBenchmarksForStation(
  benchmarks: HyroxBenchmark[],
  station: HyroxStation,
): HyroxBenchmark[] {
  return benchmarks
    .filter((b) => b.station === station)
    .sort(
      (a, b) =>
        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
    )
}

/**
 * Personal record for a station = the FASTEST recorded time.
 * Returns null when no benchmarks exist for that station.
 */
export function getStationPR(
  benchmarks: HyroxBenchmark[],
  station: HyroxStation,
): HyroxBenchmark | null {
  let pr: HyroxBenchmark | null = null
  for (const b of benchmarks) {
    if (b.station !== station) continue
    if (!pr || b.timeSeconds < pr.timeSeconds) pr = b
  }
  return pr
}

/**
 * Delta vs the most recent attempt before the PR. Negative = improved,
 * positive = regressed. Null when there is only one attempt.
 */
export function getStationTrend(
  benchmarks: HyroxBenchmark[],
  station: HyroxStation,
): {
  latest: HyroxBenchmark | null
  previous: HyroxBenchmark | null
  deltaSeconds: number | null
} {
  const stationAttempts = getBenchmarksForStation(benchmarks, station)
  const latest = stationAttempts[0] ?? null
  const previous = stationAttempts[1] ?? null
  const deltaSeconds =
    latest && previous ? latest.timeSeconds - previous.timeSeconds : null
  return { latest, previous, deltaSeconds }
}

// ── Selector hooks ───────────────────────────────────────────────────

export function useHyroxBenchmarks(): HyroxBenchmark[] {
  return useHyroxBenchmarkStore((s) => s.benchmarks)
}

export function useHyroxStationSummary(station: HyroxStation): {
  pr: HyroxBenchmark | null
  latest: HyroxBenchmark | null
  previous: HyroxBenchmark | null
  deltaSeconds: number | null
  attemptCount: number
} {
  const benchmarks = useHyroxBenchmarkStore(
    useShallow((s) => s.benchmarks.filter((b) => b.station === station)),
  )
  return useMemo(() => {
    const pr = getStationPR(benchmarks, station)
    const { latest, previous, deltaSeconds } = getStationTrend(
      benchmarks,
      station,
    )
    return {
      pr,
      latest,
      previous,
      deltaSeconds,
      attemptCount: benchmarks.length,
    }
  }, [benchmarks, station])
}
