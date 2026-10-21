import { localDateKey, localDaysEnding } from '@/lib/healthSnapshot/dateKey'
import type { HealthBodyMassSample } from '@/lib/healthSnapshot/types'

export type WeightRange = '2W' | '3M' | '6M'

export const WEIGHT_RANGE_DAYS: Record<WeightRange, number> = {
  '2W': 14,
  '3M': 91,
  '6M': 182,
}

const WEIGHT_GOAL_STEP_KG = 1
export const WEIGHT_MIN_KG = 20
export const WEIGHT_MAX_KG = 300

/** WHO adult cut-offs drawn on a 15–40 gauge, without a verdict. */
export const BMI_SCALE = { min: 15, max: 40, cutoffs: [18.5, 25, 30] } as const

export interface WeightBar {
  /** First local day the bar covers. */
  start: Date
  /** Last local day the bar covers. */
  end: Date
  /** Morning weigh-in (2W) or weekly average of them; null when none. */
  kilograms: number | null
}

export interface WeighInChange {
  sample: HealthBodyMassSample
  /** Change from the previous morning weigh-in, to 0.1 kg; null for the first. */
  changeKg: number | null
}

const roundTenths = (value: number) => Math.round(value * 10) / 10
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

/** 14 daily bars for 2W; 13 or 26 weekly averages for 3M/6M, ending on `date`. */
export function weightBars(
  mornings: Map<string, HealthBodyMassSample>,
  date: Date,
  range: WeightRange,
): WeightBar[] {
  const span = range === '2W' ? 1 : 7
  const days = localDaysEnding(date, WEIGHT_RANGE_DAYS[range])
  return Array.from({ length: days.length / span }, (_, index) => {
    const bucket = days.slice(index * span, (index + 1) * span)
    const values = bucket.flatMap((day) => {
      const sample = mornings.get(localDateKey(day))
      return sample ? [sample.kilograms] : []
    })
    return {
      start: bucket[0],
      end: bucket[bucket.length - 1],
      kilograms:
        values.length > 0
          ? values.reduce((sum, value) => sum + value, 0) / values.length
          : null,
    }
  })
}

/** Morning weigh-ins on or before `date`, within `days` when given, oldest first. */
export function weighInsEnding(
  mornings: Map<string, HealthBodyMassSample>,
  date: Date,
  days?: number,
): HealthBodyMassSample[] {
  const endKey = localDateKey(date)
  const startKey =
    days === undefined ? '' : localDateKey(localDaysEnding(date, days)[0])
  return [...mornings]
    .filter(([day]) => day >= startKey && day <= endKey)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, sample]) => sample)
}

/** The newest `count` weigh-ins, newest first, with the change from the one before. */
export function recentChanges(
  weighIns: HealthBodyMassSample[],
  count: number,
): WeighInChange[] {
  const first = Math.max(weighIns.length - count, 0)
  return weighIns
    .slice(first)
    .map((sample, index) => {
      const previous = weighIns[first + index - 1]
      return {
        sample,
        changeKg: previous
          ? roundTenths(sample.kilograms - previous.kilograms)
          : null,
      }
    })
    .reverse()
}

export type GoalStatus =
  | { kind: 'toGoal'; kilograms: number }
  | { kind: 'atGoal' }
  | { kind: 'reached' }

export function goalStatus(
  startKg: number | null,
  nowKg: number | null,
  goalKg: number | null,
): GoalStatus | null {
  if (nowKg === null || goalKg === null) return null
  const difference = roundTenths(nowKg - goalKg)
  if (difference === 0) return { kind: 'atGoal' }
  const direction = startKg === null ? 0 : Math.sign(startKg - goalKg)
  if (direction !== 0 && direction !== Math.sign(difference)) {
    return { kind: 'reached' }
  }
  return { kind: 'toGoal', kilograms: Math.abs(difference) }
}

/** Share of the start-to-goal distance covered, 0–1; null without a direction. */
export function goalProgress(
  startKg: number | null,
  nowKg: number | null,
  goalKg: number | null,
): number | null {
  if (startKg === null || nowKg === null || goalKg === null) return null
  if (startKg === goalKg) return null
  return clamp((startKg - nowKg) / (startKg - goalKg), 0, 1)
}

/** Next goal after a ± press; the first press starts from the current weight. */
export function steppedGoal(
  goalKg: number | null,
  nowKg: number | null,
  direction: 1 | -1,
): number {
  const base = goalKg ?? Math.round(nowKg ?? 70)
  return clamp(
    Math.round(base + direction * WEIGHT_GOAL_STEP_KG),
    WEIGHT_MIN_KG,
    WEIGHT_MAX_KG,
  )
}

export function bodyMassIndex(
  kilograms: number | null,
  meters: number | null,
): number | null {
  if (kilograms === null || meters === null) return null
  if (!(kilograms > 0) || !(meters > 0)) return null
  const bmi = kilograms / (meters * meters)
  return Number.isFinite(bmi) ? bmi : null
}

/** Position of a BMI on the gauge, 0–1. */
export function bmiGaugePosition(bmi: number): number {
  return clamp((bmi - BMI_SCALE.min) / (BMI_SCALE.max - BMI_SCALE.min), 0, 1)
}
