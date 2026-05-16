/**
 * Hyrox station catalogue + competitive benchmarks.
 *
 * Times below are based on competitive amateur targets (≈ Pro Am qualifier).
 * Color thresholds: ≤ target → green, ≤ 1.25× target → amber, else red.
 */

export type HyroxStation =
  | 'run_1km'
  | 'ski_erg_1000m'
  | 'sled_push_50m'
  | 'sled_pull_50m'
  | 'burpee_broad_jump_80m'
  | 'row_1000m'
  | 'farmers_carry_200m'
  | 'sandbag_lunges_100m'
  | 'wall_balls_100'
  | 'simulated_total'

export interface StationMeta {
  id: HyroxStation
  label: string
  short: string
  targetSeconds: number
  supportsWeight: boolean
  defaultWeightKg?: number
  ioniconName: string
}

export const HYROX_STATIONS: readonly StationMeta[] = [
  {
    id: 'run_1km',
    label: '1km Run',
    short: 'Run',
    targetSeconds: 300, // 5:00
    supportsWeight: false,
    ioniconName: 'walk',
  },
  {
    id: 'ski_erg_1000m',
    label: '1000m SkiErg',
    short: 'SkiErg',
    targetSeconds: 240, // 4:00
    supportsWeight: false,
    ioniconName: 'fitness',
  },
  {
    id: 'sled_push_50m',
    label: 'Sled Push 50m',
    short: 'Sled Push',
    targetSeconds: 90, // 1:30
    supportsWeight: true,
    defaultWeightKg: 152,
    ioniconName: 'arrow-forward',
  },
  {
    id: 'sled_pull_50m',
    label: 'Sled Pull 50m',
    short: 'Sled Pull',
    targetSeconds: 105, // 1:45
    supportsWeight: true,
    defaultWeightKg: 103,
    ioniconName: 'arrow-back',
  },
  {
    id: 'burpee_broad_jump_80m',
    label: 'Burpee Broad Jumps 80m',
    short: 'Burpees',
    targetSeconds: 270, // 4:30
    supportsWeight: false,
    ioniconName: 'trending-up',
  },
  {
    id: 'row_1000m',
    label: '1000m Row',
    short: 'Row',
    targetSeconds: 240, // 4:00
    supportsWeight: false,
    ioniconName: 'boat',
  },
  {
    id: 'farmers_carry_200m',
    label: "Farmer's Carry 200m",
    short: "Farmer's",
    targetSeconds: 90, // 1:30
    supportsWeight: true,
    defaultWeightKg: 48, // 2 × 24kg
    ioniconName: 'briefcase',
  },
  {
    id: 'sandbag_lunges_100m',
    label: 'Sandbag Lunges 100m',
    short: 'Lunges',
    targetSeconds: 240, // 4:00
    supportsWeight: true,
    defaultWeightKg: 20,
    ioniconName: 'body',
  },
  {
    id: 'wall_balls_100',
    label: '100 Wall Balls',
    short: 'Wall Balls',
    targetSeconds: 270, // 4:30
    supportsWeight: true,
    defaultWeightKg: 9,
    ioniconName: 'basketball',
  },
  {
    id: 'simulated_total',
    label: 'Simulated Hyrox',
    short: 'Full Race',
    targetSeconds: 5400, // 90:00
    supportsWeight: false,
    ioniconName: 'flag',
  },
] as const

const STATION_BY_ID = new Map<HyroxStation, StationMeta>(
  HYROX_STATIONS.map((s) => [s.id, s]),
)

export function getStation(id: HyroxStation): StationMeta {
  const meta = STATION_BY_ID.get(id)
  if (!meta) throw new Error(`Unknown Hyrox station: ${id}`)
  return meta
}

export type BenchmarkStatus = 'green' | 'amber' | 'red'

export function compareToTarget(
  stationId: HyroxStation,
  timeSeconds: number,
): BenchmarkStatus {
  const target = getStation(stationId).targetSeconds
  if (timeSeconds <= target) return 'green'
  if (timeSeconds <= target * 1.25) return 'amber'
  return 'red'
}

export function formatStationTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—'
  const totalSeconds = Math.round(seconds)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function parseStationTime(input: string): number | null {
  const trimmed = input.trim()
  if (!/^\d{1,2}(:\d{1,2}){0,2}$/.test(trimmed)) return null
  const parts = trimmed.split(':').map(Number)
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) {
    const [m, s] = parts
    if (s >= 60) return null
    return m * 60 + s
  }
  const [h, m, s] = parts
  if (m >= 60 || s >= 60) return null
  return h * 3600 + m * 60 + s
}
