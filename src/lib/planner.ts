import { z } from 'zod'

import { DAILY_STEP_GOAL } from '@/lib/dailyGoals'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'

export const stationSchema = z.object({
  gtfsId: z.string().regex(/^HSL:[A-Za-z0-9:_-]+$/),
  name: z.string().min(1).max(200),
  lat: z.number().min(59).max(62),
  lon: z.number().min(23).max(27),
})

export const commuteSchema = z
  .object({
    home: stationSchema,
    work: stationSchema,
    start: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    end: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
    homeWalkMinutes: z.number().int().min(0).max(120),
    workWalkMinutes: z.number().int().min(0).max(120),
  })
  .refine((value) => value.start < value.end, 'Work must end after it starts.')
  .refine(
    (value) => value.home.gtfsId !== value.work.gtfsId,
    'Choose different home and work stops.',
  )

export type Station = z.infer<typeof stationSchema>
export type Commute = z.infer<typeof commuteSchema>

const accessSchema = z.enum(['granted', 'denied', 'undetermined'])
export const plannerDaySchema = z.object({
  calendarAccess: accessSchema,
  remindersAccess: accessSchema,
  events: z
    .array(
      z
        .object({
          id: z.string(),
          title: z.string(),
          startMs: z.number().finite(),
          endMs: z.number().finite(),
          allDay: z.boolean(),
        })
        .refine((event) => event.endMs >= event.startMs),
    )
    .max(200),
  reminders: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        dueMs: z.number().finite().nullable(),
        hasDueTime: z.boolean(),
        priority: z.number().int().min(0).max(9),
        completed: z.boolean(),
      }),
    )
    .max(200),
})
export type PlannerDay = z.infer<typeof plannerDaySchema>
export type Reminder = PlannerDay['reminders'][number]
export interface TimeBlock {
  startMs: number
  endMs: number
}

export function greeting(now: Date): string {
  const hour = now.getHours()
  return hour < 5 || hour >= 22
    ? 'Good night'
    : hour < 12
      ? 'Good morning'
      : hour < 17
        ? 'Good afternoon'
        : 'Good evening'
}

export function atTime(day: Date, time: string): number {
  const [hour, minute] = time.split(':').map(Number)
  const date = new Date(day)
  date.setHours(hour, minute, 0, 0)
  return date.getTime()
}

export function reminderUrgency(reminder: Reminder, now: Date) {
  if (reminder.completed) return null
  if (reminder.dueMs !== null) {
    const due = new Date(reminder.dueMs)
    const overdue = reminder.hasDueTime
      ? reminder.dueMs < now.getTime()
      : localDateKey(due) < localDateKey(now)
    if (overdue) return 'Overdue'
    if (reminder.hasDueTime && reminder.dueMs <= now.getTime() + 60 * 60_000) {
      return 'Due soon'
    }
  }
  if (reminder.priority > 0 && reminder.priority <= 4) return 'High priority'
  return null
}

export const AGENDA_PERIODS = [
  'Anytime',
  'Morning',
  'Afternoon',
  'Night',
] as const
export type AgendaPeriod = (typeof AGENDA_PERIODS)[number]

export function agendaPeriod(
  milliseconds: number | null,
  date: Date,
): AgendaPeriod {
  if (
    milliseconds === null ||
    localDateKey(new Date(milliseconds)) !== localDateKey(date)
  ) {
    return 'Anytime'
  }
  const hour = new Date(milliseconds).getHours()
  return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Night'
}

export function workBlock(
  now: Date,
  commute: Commute | null,
): TimeBlock | null {
  if (now.getDay() === 0 || now.getDay() === 6) return null
  return {
    startMs: atTime(now, commute?.start ?? '09:00'),
    endMs: atTime(now, commute?.end ?? '17:00'),
  }
}

/** Suggestions only: never create or move Calendar events. */
export function freeBlocks(now: Date, busy: TimeBlock[]): TimeBlock[] {
  const end = atTime(now, '22:00')
  let cursor = Math.max(now.getTime(), atTime(now, '07:00'))
  const free: TimeBlock[] = []
  for (const block of [...busy].sort((a, b) => a.startMs - b.startMs)) {
    if (block.endMs <= block.startMs) continue
    if (block.endMs <= cursor || block.startMs >= end) continue
    if (block.startMs > cursor) {
      free.push({ startMs: cursor, endMs: Math.min(block.startMs, end) })
    }
    cursor = Math.max(cursor, block.endMs)
  }
  if (cursor < end) free.push({ startMs: cursor, endMs: end })
  return free.filter((block) => block.endMs - block.startMs >= 15 * 60_000)
}

export interface SuggestedBlock extends TimeBlock {
  id: string
  title: string
}

/** At most three proposals: urgent review (15m), Gym (45m), walk (15m), then focus (25m).
 * These are planning budgets, not measured durations or additional completion goals.
 */
export function suggestDayPlan({
  now,
  day,
  commute,
  journeys,
  steps,
  gymFinished,
  deepWorkActive,
}: {
  now: Date
  day: PlannerDay | null
  commute: Commute | null
  journeys: TimeBlock[]
  steps: number | null
  gymFinished: boolean
  deepWorkActive: boolean
}): SuggestedBlock[] {
  if (day?.calendarAccess !== 'granted') return []
  const work = workBlock(now, commute)
  const gaps = freeBlocks(now, [
    ...day.events,
    ...(work ? [work] : []),
    ...journeys,
  ]).map((gap) => ({ ...gap }))
  const candidates = [
    ...(day.remindersAccess === 'granted' &&
    day.reminders.some((reminder) => reminderUrgency(reminder, now))
      ? [{ id: 'review', title: 'Review urgent reminders', minutes: 15 }]
      : []),
    ...(!gymFinished ? [{ id: 'gym', title: 'Gym session', minutes: 45 }] : []),
    ...(steps !== null &&
    Number.isFinite(steps) &&
    steps >= 0 &&
    steps < DAILY_STEP_GOAL
      ? [{ id: 'walk', title: 'Short walk', minutes: 15 }]
      : []),
    ...(!deepWorkActive
      ? [{ id: 'focus', title: 'Focus block', minutes: 25 }]
      : []),
  ]
  const suggestions: SuggestedBlock[] = []
  for (const candidate of candidates) {
    if (suggestions.length === 3) break
    const duration = candidate.minutes * 60_000
    const gap = gaps.find((gap) => gap.endMs - gap.startMs >= duration)
    if (!gap) continue
    suggestions.push({
      id: `suggested-${candidate.id}`,
      title: candidate.title,
      startMs: gap.startMs,
      endMs: gap.startMs + duration,
    })
    gap.startMs += duration
  }
  return suggestions.sort((a, b) => a.startMs - b.startMs)
}
