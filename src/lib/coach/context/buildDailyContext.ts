import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import type { RecoveryResult } from '@/utils/recovery'
import type { DailyCoachContext } from '../types'

export interface BuildDailyContextInput {
  dateISO: string
  snapshot: DailyHealthSnapshot
  recovery: RecoveryResult | null
}

export function buildDailyContext(
  input: BuildDailyContextInput,
): DailyCoachContext {
  return {
    dateISO: input.dateISO,
    snapshot: input.snapshot,
    recovery: input.recovery,
  }
}

export function formatDailyContextForPrompt(ctx: DailyCoachContext): string {
  const lines = [`- date: ${ctx.dateISO}`]
  appendMetric(lines, 'steps', ctx.snapshot.steps)
  appendMetric(lines, 'calories', ctx.snapshot.calories)
  appendMetric(lines, 'dietaryCalories', ctx.snapshot.dietaryCalories)
  appendMetric(lines, 'sleepHours', ctx.snapshot.sleepHours)
  appendMetric(lines, 'heartRate', ctx.snapshot.heartRate)
  appendMetric(lines, 'hrv', ctx.snapshot.hrv)
  appendMetric(lines, 'restingHeartRate', ctx.snapshot.restingHeartRate)
  appendMetric(lines, 'waterLiters', ctx.snapshot.waterLiters)
  appendMetric(lines, 'flightsClimbed', ctx.snapshot.flightsClimbed)
  appendMetric(lines, 'bodyMassKg', ctx.snapshot.bodyMassKg)

  if (ctx.recovery) {
    lines.push(`- recoveryScore: ${ctx.recovery.score}`)
    lines.push(`- recoveryLabel: ${ctx.recovery.label}`)
  }

  if (ctx.snapshot.workouts.length > 0) {
    const summaries = ctx.snapshot.workouts
      .slice(0, 3)
      .map((workout) =>
        Number.isFinite(workout.durationMinutes) && workout.durationMinutes >= 0
          ? `${workout.activityName} ${Math.round(workout.durationMinutes)}min`
          : `${workout.activityName} (duration unavailable)`,
      )
      .join('; ')
    lines.push(`- healthWorkouts: ${summaries}`)
  }

  return limitWords(lines.join('\n'), 150)
}

function appendMetric(
  lines: string[],
  label: string,
  value: number | null,
): void {
  if (value !== null && Number.isFinite(value)) {
    lines.push(`- ${label}: ${value}`)
  }
}

function limitWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/)
  return words.length <= maxWords ? text : words.slice(0, maxWords).join(' ')
}
