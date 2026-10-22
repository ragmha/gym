import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'
import { z } from 'zod'

import { plannerDaySchema } from '@/lib/planner'

interface DayPlannerNative {
  readDay(startMs: number, endMs: number): Promise<unknown>
  requestCalendarAccess(): Promise<boolean>
  requestRemindersAccess(): Promise<boolean>
  getTransitKey(): Promise<string | null>
  setTransitKey(key: string): Promise<void>
  setReminderCompleted(id: string, completed: boolean): Promise<unknown>
}

export function plannerNative(): DayPlannerNative | null {
  if (
    Platform.OS !== 'ios' ||
    !(Number.parseFloat(String(Platform.Version)) >= 17)
  ) {
    return null
  }
  const module = requireOptionalNativeModule<DayPlannerNative>('DayPlanner')
  return module &&
    typeof module.readDay === 'function' &&
    typeof module.setReminderCompleted === 'function'
    ? module
    : null
}

const completionSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(1024)
    .refine((id) => id.trim().length > 0 && !/[\p{Cc}\p{Cf}]/u.test(id)),
  completed: z.boolean(),
})

export async function setPlannerReminderCompleted(
  id: string,
  completed: boolean,
) {
  const input = completionSchema.safeParse({ id, completed })
  if (!input.success) throw new Error('Invalid reminder change.')
  const native = plannerNative()
  if (!native) throw new Error('Reminder changes need a new iOS 17+ build.')
  const saved = completionSchema.safeParse(
    await native.setReminderCompleted(input.data.id, input.data.completed),
  )
  if (
    !saved.success ||
    saved.data.id !== id ||
    saved.data.completed !== completed
  ) {
    throw new Error('Apple Reminders did not confirm the change.')
  }
  return saved.data
}

export async function readPlannerDay(now: Date) {
  const native = plannerNative()
  if (!native) throw new Error('Today connections need a new iOS 17+ build.')
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  const parsed = plannerDaySchema.safeParse(
    await native.readDay(start.getTime(), end.getTime()),
  )
  if (!parsed.success) throw new Error('Unable to read Calendar and Reminders.')
  return parsed.data
}
