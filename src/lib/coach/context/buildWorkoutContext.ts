import type { WorkoutSession, WorkoutTemplate } from '@/types/models'
import type { RecoveryResult } from '@/utils/recovery'
import {
  computeWorkoutEfficiency,
  type PriorSessionAggregate,
  type WorkoutEfficiency,
} from '@/lib/workoutEfficiency'
import type { WorkoutCoachContext } from '../types'

export interface BuildWorkoutContextInput {
  session: WorkoutSession
  template: WorkoutTemplate
  recovery: RecoveryResult | null
  history?: readonly PriorSessionAggregate[]
}

export function buildWorkoutContext(
  input: BuildWorkoutContextInput,
): WorkoutCoachContext {
  return {
    templateTitle: input.template.title,
    templateDay: input.template.day,
    templateWeek: input.template.week,
    efficiency: computeWorkoutEfficiency(
      input.session,
      input.template,
      input.history,
    ),
    recovery: input.recovery,
  }
}

export function formatWorkoutContextForPrompt(
  ctx: WorkoutCoachContext,
): string {
  const { efficiency } = ctx
  const lines = [
    `- workout: ${ctx.templateTitle}`,
    `- day: ${ctx.templateDay}`,
    `- week: ${ctx.templateWeek}`,
    `- volumeKg: ${Math.round(efficiency.totalVolumeKg)}`,
    `- sets: ${efficiency.completedSets}/${efficiency.totalSets}`,
    `- completionRate: ${Math.round(efficiency.completionRate * 100)}%`,
  ]

  appendMetric(lines, 'durationMin', efficiency.durationMinutes)
  appendMetric(lines, 'densityKgPerMin', efficiency.sessionDensityKgPerMin)
  appendMetric(lines, 'weekOverWeekVolumePct', efficiency.weekOverWeekVolumePct)

  if (ctx.recovery) {
    lines.push(`- recoveryScore: ${ctx.recovery.score}`)
    lines.push(`- recoveryLabel: ${ctx.recovery.label}`)
  }

  return limitWords(lines.join('\n'), 150)
}

function appendMetric(
  lines: string[],
  label: string,
  value: number | null,
): void {
  if (value !== null) {
    lines.push(`- ${label}: ${round1(value)}`)
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function limitWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/)
  return words.length <= maxWords ? text : words.slice(0, maxWords).join(' ')
}

export type { WorkoutEfficiency }
