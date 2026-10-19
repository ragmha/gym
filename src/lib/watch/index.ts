import { z } from 'zod'

import {
  exerciseHistory,
  findProgrammeDay,
  programmeDayFor,
} from '@/lib/gymProgramme'
import {
  useGymLogStore,
  type GymDayLog,
  type LoggedSet,
} from '@/stores/GymLogStore'

/** Today's lifting day as the Apple Watch shows it (see modules/gym-watch). */
export interface WatchState {
  dateKey: string
  day: string | null
  title: string
  subtitle: string | null
  note: string | null
  locked: boolean
  exercises: {
    id: string
    title: string
    /** Null for "To Failure" exercises. */
    sets: number | null
    reps: number
    /** Load to start from (null is body weight). */
    kilograms: number | null
    logged: LoggedSet[]
  }[]
}

interface GymLog {
  programmeStart: string | null
  logs: Record<string, GymDayLog>
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Derives the day exactly as the Lifting screen does, so both log into the same day. */
export function watchState(
  { programmeStart, logs }: GymLog,
  dateKey: string,
): WatchState {
  const log = logs[dateKey]
  const scheduled =
    !log && programmeStart ? programmeDayFor(programmeStart, dateKey) : null
  const day = log
    ? findProgrammeDay(log.day)
    : scheduled && 'day' in scheduled
      ? scheduled.day
      : null
  const note =
    !programmeStart && !log
      ? 'Start the programme on your iPhone.'
      : !day
        ? scheduled &&
          'reason' in scheduled &&
          scheduled.reason === 'before-start'
          ? 'Before your programme starts.'
          : 'Programme complete.'
        : day.exercises.length === 0
          ? 'Active rest day. Cardio only.'
          : null

  return {
    dateKey,
    day: day?.day ?? null,
    title: !day
      ? 'Lifting'
      : 'week' in day
        ? `Week ${day.week} · Day ${pad(Number(day.day))}`
        : 'StrongLifts 5×5',
    subtitle: day?.title ?? null,
    note,
    locked: Boolean(log?.finishedAt),
    exercises: (day?.exercises ?? []).map((exercise) => {
      const logged = log?.sets[exercise.id] ?? []
      const previous = exerciseHistory(logs, exercise.title, dateKey)
        .filter((session) => session.dateKey < dateKey)
        .at(-1)
      return {
        id: exercise.id,
        title: exercise.title,
        sets: typeof exercise.sets === 'number' ? exercise.sets : null,
        reps: exercise.reps,
        // The watch has no keypad: start from today's last set, else last session's first.
        kilograms: (logged.at(-1) ?? previous?.sets[0])?.kilograms ?? null,
        logged,
      }
    }),
  }
}

const watchMessage = z.discriminatedUnion('action', [
  z.object({ action: z.literal('sync') }),
  z.object({
    action: z.literal('log'),
    dateKey: z.string(),
    day: z.string(),
    exerciseId: z.string(),
    reps: z.number(),
    kilograms: z.number().nullable(),
  }),
  z.object({
    action: z.literal('undo'),
    dateKey: z.string(),
    exerciseId: z.string(),
  }),
])

/**
 * Applies one watch tap to today's log. Stale or invalid taps are dropped;
 * the state pushed afterwards corrects the watch.
 */
export function applyWatchMessage(json: string, today: string): void {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return
  }
  const parsed = watchMessage.safeParse(data)
  if (!parsed.success || parsed.data.action === 'sync') return
  const message = parsed.data
  if (message.dateKey !== today) return

  const store = useGymLogStore.getState()
  if (message.action === 'undo') {
    store.removeLastSet(today, message.exerciseId)
    return
  }
  const current = watchState(store, today)
  if (
    message.day !== current.day ||
    !current.exercises.some((exercise) => exercise.id === message.exerciseId)
  )
    return
  // logSet still rejects invalid sets and finished workouts.
  store.logSet(today, message.day, message.exerciseId, {
    reps: message.reps,
    kilograms: message.kilograms,
  })
}
