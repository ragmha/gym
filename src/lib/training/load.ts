/**
 * Pure aggregation helpers for the hybrid-athlete dashboard.
 *
 * Consumes a normalised `TrainingSession[]` (HealthKit workouts + completed
 * gym strength sessions merged upstream) and produces:
 *   - weekly volume per pillar with week-over-week delta
 *   - 14-day stacked bar data
 *   - auto-calibrated weekly targets (trailing 4 weeks)
 *   - ACWR with explicit edge-case handling
 */

import type { Pillar } from './pillars'

export interface TrainingSession {
  source: 'healthkit' | 'gym-log'
  pillar: Pillar
  startISO: string
  durationMinutes: number
  distanceMeters?: number
}

export interface WeeklyVolume {
  pillar: Pillar
  minutes: number
  distanceMeters: number
  sessionCount: number
  vsLastWeekMinutes: number
}

export interface DailyBar {
  /** YYYY-MM-DD in the local timezone */
  dateISO: string
  strength: number
  run: number
  conditioning: number
}

export interface CalibratedTargets {
  strengthMinutes: number
  runMinutes: number
  conditioningMinutes: number
  source: 'fallback' | 'partial' | 'calibrated'
  weeksObserved: number
}

export type ACWRStatus = 'low' | 'optimal' | 'high' | 'unavailable'

export interface ACWR {
  value: number | null
  status: ACWRStatus
  acuteMinutes: number
  chronicMinutes: number
}

/**
 * Hybrid + Hyrox base-phase fallback targets (minutes per week).
 * Used while we collect 4 weeks of real data for auto-calibration.
 */
export const FALLBACK_WEEKLY_TARGETS = {
  strengthMinutes: 180, // 3 sessions × 60min
  runMinutes: 180, // 3 runs × 60min
  conditioningMinutes: 120, // 2–3 conditioning sessions × 45min
} as const

const MINUTES_PER_DAY = 24 * 60
const DAY_MS = MINUTES_PER_DAY * 60 * 1000

/**
 * Local-time YYYY-MM-DD for a given date.
 */
export function localDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Returns the Monday 00:00 (local time) of the week containing `date`.
 */
export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = Sun, 1 = Mon, …
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function pillarSums(
  sessions: readonly TrainingSession[],
  startInclusive: Date,
  endExclusive: Date,
): Record<Pillar, { minutes: number; distance: number; count: number }> {
  const result: Record<
    Pillar,
    { minutes: number; distance: number; count: number }
  > = {
    strength: { minutes: 0, distance: 0, count: 0 },
    run: { minutes: 0, distance: 0, count: 0 },
    conditioning: { minutes: 0, distance: 0, count: 0 },
  }
  for (const session of sessions) {
    const t = new Date(session.startISO).getTime()
    if (t < startInclusive.getTime() || t >= endExclusive.getTime()) continue
    const bucket = result[session.pillar]
    bucket.minutes += Math.max(0, session.durationMinutes)
    bucket.distance += Math.max(0, session.distanceMeters ?? 0)
    bucket.count += 1
  }
  return result
}

/**
 * Aggregate sessions for the current week (Mon–today) and compute the delta
 * vs the prior week for each pillar.
 */
export function aggregateWeekly(
  sessions: readonly TrainingSession[],
  now: Date,
): WeeklyVolume[] {
  const weekStart = startOfWeekMonday(now)
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS)
  const priorStart = new Date(weekStart.getTime() - 7 * DAY_MS)

  const thisWeek = pillarSums(sessions, weekStart, weekEnd)
  const lastWeek = pillarSums(sessions, priorStart, weekStart)

  const pillars: Pillar[] = ['strength', 'run', 'conditioning']
  return pillars.map((pillar) => ({
    pillar,
    minutes: Math.round(thisWeek[pillar].minutes),
    distanceMeters: Math.round(thisWeek[pillar].distance),
    sessionCount: thisWeek[pillar].count,
    vsLastWeekMinutes: Math.round(
      thisWeek[pillar].minutes - lastWeek[pillar].minutes,
    ),
  }))
}

/**
 * Build N days of stacked-bar data ending today (inclusive). Days with no
 * sessions still appear (with zero values) so the chart never collapses.
 */
export function buildDailyBars(
  sessions: readonly TrainingSession[],
  now: Date,
  daysBack: number,
): DailyBar[] {
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const bars: DailyBar[] = []
  for (let i = daysBack - 1; i >= 0; i--) {
    const dayStart = new Date(todayStart.getTime() - i * DAY_MS)
    const dayEnd = new Date(dayStart.getTime() + DAY_MS)
    const sums = pillarSums(sessions, dayStart, dayEnd)
    bars.push({
      dateISO: localDateKey(dayStart),
      strength: Math.round(sums.strength.minutes),
      run: Math.round(sums.run.minutes),
      conditioning: Math.round(sums.conditioning.minutes),
    })
  }
  return bars
}

/**
 * Auto-calibrate weekly targets from trailing 4 complete weeks. Cold-start
 * rule: fewer than 1 complete week → fallback. 1–3 weeks → blend (50% real,
 * 50% fallback) so the bars are still meaningful. 4+ weeks → trailing average.
 */
export function calibrateTargets(
  sessions: readonly TrainingSession[],
  now: Date,
): CalibratedTargets {
  const weekStart = startOfWeekMonday(now)
  // Look at the 4 *complete* weeks before this one.
  const windowStart = new Date(weekStart.getTime() - 4 * 7 * DAY_MS)
  const completeWeeksWindow = pillarSums(sessions, windowStart, weekStart)
  const earliestSession = sessions.reduce<Date | null>((acc, s) => {
    const t = new Date(s.startISO)
    return acc && acc < t ? acc : t
  }, null)
  // Normalise earliest session to start-of-day so a 7am workout 14 days ago
  // counts as a full 2 weeks of history, not 1.9 weeks.
  const earliestDay = earliestSession ? new Date(earliestSession) : null
  if (earliestDay) earliestDay.setHours(0, 0, 0, 0)
  const weeksObserved = earliestDay
    ? Math.min(
        4,
        Math.max(
          0,
          Math.floor(
            (weekStart.getTime() - earliestDay.getTime()) / (7 * DAY_MS),
          ),
        ),
      )
    : 0

  const avg = {
    strength: completeWeeksWindow.strength.minutes / 4,
    run: completeWeeksWindow.run.minutes / 4,
    conditioning: completeWeeksWindow.conditioning.minutes / 4,
  }

  if (weeksObserved < 1) {
    return {
      strengthMinutes: FALLBACK_WEEKLY_TARGETS.strengthMinutes,
      runMinutes: FALLBACK_WEEKLY_TARGETS.runMinutes,
      conditioningMinutes: FALLBACK_WEEKLY_TARGETS.conditioningMinutes,
      source: 'fallback',
      weeksObserved,
    }
  }

  if (weeksObserved < 4) {
    const partialWindowWeeks = Math.max(weeksObserved, 1)
    const partialAvg = {
      strength: completeWeeksWindow.strength.minutes / partialWindowWeeks,
      run: completeWeeksWindow.run.minutes / partialWindowWeeks,
      conditioning:
        completeWeeksWindow.conditioning.minutes / partialWindowWeeks,
    }
    return {
      strengthMinutes: Math.round(
        partialAvg.strength * 0.5 +
          FALLBACK_WEEKLY_TARGETS.strengthMinutes * 0.5,
      ),
      runMinutes: Math.round(
        partialAvg.run * 0.5 + FALLBACK_WEEKLY_TARGETS.runMinutes * 0.5,
      ),
      conditioningMinutes: Math.round(
        partialAvg.conditioning * 0.5 +
          FALLBACK_WEEKLY_TARGETS.conditioningMinutes * 0.5,
      ),
      source: 'partial',
      weeksObserved,
    }
  }

  // Add 10% progression on top of the trailing average so targets pull
  // forward rather than plateau at the current load.
  return {
    strengthMinutes: Math.max(30, Math.round(avg.strength * 1.1)),
    runMinutes: Math.max(30, Math.round(avg.run * 1.1)),
    conditioningMinutes: Math.max(30, Math.round(avg.conditioning * 1.1)),
    source: 'calibrated',
    weeksObserved,
  }
}

/**
 * Acute:Chronic Workload Ratio using duration as the load proxy.
 *
 * - acute = sum of last 7 days
 * - chronic = sum of last 28 days / 4
 *
 * Edge cases:
 * - chronic == 0 && acute == 0 → unavailable (no training history)
 * - chronic == 0 && acute > 0 → unavailable (new load, no baseline)
 * - chronic < 60 min → unavailable (too little baseline to be meaningful)
 */
export function computeACWR(
  sessions: readonly TrainingSession[],
  now: Date,
): ACWR {
  const acuteStart = new Date(now.getTime() - 7 * DAY_MS)
  const chronicStart = new Date(now.getTime() - 28 * DAY_MS)
  const endExclusive = new Date(now.getTime() + 1)

  const acuteSums = pillarSums(sessions, acuteStart, endExclusive)
  const chronicSums = pillarSums(sessions, chronicStart, endExclusive)

  const acuteMinutes = Math.round(
    acuteSums.strength.minutes +
      acuteSums.run.minutes +
      acuteSums.conditioning.minutes,
  )
  const chronicMinutes = Math.round(
    (chronicSums.strength.minutes +
      chronicSums.run.minutes +
      chronicSums.conditioning.minutes) /
      4,
  )

  if (chronicMinutes < 60) {
    return {
      value: null,
      status: 'unavailable',
      acuteMinutes,
      chronicMinutes,
    }
  }

  const ratio = acuteMinutes / chronicMinutes
  const rounded = Math.round(ratio * 100) / 100
  let status: ACWRStatus
  if (rounded < 0.8) status = 'low'
  else if (rounded <= 1.3) status = 'optimal'
  else status = 'high'

  return {
    value: rounded,
    status,
    acuteMinutes,
    chronicMinutes,
  }
}
