import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'
import { computeWorkoutEfficiency } from '@/lib/workoutEfficiency'
import type { WorkoutSession, WorkoutTemplate } from '@/types/models'
import type { RecoveryResult } from '@/utils/recovery'
import type { DailyCoachContext, RecentWorkoutSummary } from '../types'

export interface BuildDailyContextInput {
  dateISO: string
  snapshot: DailyHealthSnapshot
  recovery: RecoveryResult | null
  recentWorkouts?: readonly {
    session: WorkoutSession
    template: WorkoutTemplate
  }[]
}

export function buildDailyContext(
  input: BuildDailyContextInput,
): DailyCoachContext {
  return {
    dateISO: input.dateISO,
    snapshot: input.snapshot,
    recovery: input.recovery,
    recentWorkouts: (input.recentWorkouts ?? [])
      .filter((entry) => entry.session.completedAt !== null)
      .map(toRecentWorkoutSummary),
  }
}

export function formatDailyContextForPrompt(ctx: DailyCoachContext): string {
  const lines = [`- date: ${ctx.dateISO}`]
  appendMetric(lines, 'steps', ctx.snapshot.steps)
  appendMetric(lines, 'calories', ctx.snapshot.calories)
  appendMetric(lines, 'sleepHours', ctx.snapshot.sleepHours)
  appendMetric(lines, 'heartRate', ctx.snapshot.heartRate)
  appendMetric(lines, 'hrv', ctx.snapshot.hrv)
  appendMetric(lines, 'restingHeartRate', ctx.snapshot.restingHeartRate)
  appendMetric(lines, 'waterLiters', ctx.snapshot.waterLiters)
  appendMetric(lines, 'flightsClimbed', ctx.snapshot.flightsClimbed)

  if (ctx.recovery) {
    lines.push(`- recoveryScore: ${ctx.recovery.score}`)
    lines.push(`- recoveryLabel: ${ctx.recovery.label}`)
  }

  if (ctx.snapshot.workouts.length > 0) {
    lines.push(`- healthWorkouts: ${ctx.snapshot.workouts.length}`)
  }

  if (ctx.recentWorkouts.length > 0) {
    const summaries = ctx.recentWorkouts
      .slice(0, 3)
      .map(
        (workout) =>
          `${workout.templateTitle} ${Math.round(workout.totalVolumeKg)}kg on ${workout.completedAt}`,
      )
      .join('; ')
    lines.push(`- recentStrength: ${summaries}`)
  }

  return limitWords(lines.join('\n'), 150)
}

function toRecentWorkoutSummary(entry: {
  session: WorkoutSession
  template: WorkoutTemplate
}): RecentWorkoutSummary {
  return {
    templateTitle: entry.template.title,
    completedAt: entry.session.completedAt ?? '',
    totalVolumeKg: computeWorkoutEfficiency(entry.session, entry.template)
      .totalVolumeKg,
  }
}

function appendMetric(
  lines: string[],
  label: string,
  value: number | string | null,
): void {
  if (value !== null) {
    lines.push(`- ${label}: ${value}`)
  }
}

function limitWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/)
  return words.length <= maxWords ? text : words.slice(0, maxWords).join(' ')
}
