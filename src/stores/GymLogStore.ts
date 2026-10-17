import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export const MAX_REPS = 500
export const MAX_SET_KILOGRAMS = 1000

export interface LoggedSet {
  reps: number
  /** Null when the set used body weight or no load was entered. */
  kilograms: number | null
}

export interface GymDayLog {
  /** Programme day the sets belong to, fixed when the first set is saved. */
  day: string
  sets: Record<string, LoggedSet[]>
  finishedAt: string | null
  rating: number | null
  notes: string
}

interface GymLogState {
  /** Local YYYY-MM-DD the programme's day 1 falls on. */
  programmeStart: string | null
  logs: Record<string, GymDayLog>
  startProgramme: (dateKey: string) => void
  logSet: (
    dateKey: string,
    day: string,
    exerciseId: string,
    set: LoggedSet,
  ) => void
  removeLastSet: (dateKey: string, exerciseId: string) => void
  finishWorkout: (
    dateKey: string,
    summary: { rating: number; notes: string; finishedAt: Date },
  ) => void
}

export function isValidSet({ reps, kilograms }: LoggedSet): boolean {
  return (
    Number.isInteger(reps) &&
    reps > 0 &&
    reps <= MAX_REPS &&
    (kilograms === null ||
      (Number.isFinite(kilograms) &&
        kilograms > 0 &&
        kilograms <= MAX_SET_KILOGRAMS))
  )
}

export const useGymLogStore = create<GymLogState>()(
  persist(
    (set) => ({
      programmeStart: null,
      logs: {},
      startProgramme: (dateKey) => set({ programmeStart: dateKey }),
      logSet: (dateKey, day, exerciseId, entry) =>
        set((state) => {
          const log = state.logs[dateKey]
          if (!isValidSet(entry) || log?.finishedAt || (log && log.day !== day))
            return state
          const current = log ?? {
            day,
            sets: {},
            finishedAt: null,
            rating: null,
            notes: '',
          }
          return {
            logs: {
              ...state.logs,
              [dateKey]: {
                ...current,
                sets: {
                  ...current.sets,
                  [exerciseId]: [...(current.sets[exerciseId] ?? []), entry],
                },
              },
            },
          }
        }),
      removeLastSet: (dateKey, exerciseId) =>
        set((state) => {
          const log = state.logs[dateKey]
          const sets = log?.sets[exerciseId]
          if (!log || log.finishedAt || !sets?.length) return state
          const nextSets = { ...log.sets, [exerciseId]: sets.slice(0, -1) }
          const logs = { ...state.logs }
          // An emptied log must not pin this date to its old programme day.
          if (Object.values(nextSets).every((list) => list.length === 0)) {
            delete logs[dateKey]
          } else {
            logs[dateKey] = { ...log, sets: nextSets }
          }
          return { logs }
        }),
      finishWorkout: (dateKey, { rating, notes, finishedAt }) =>
        set((state) => {
          const log = state.logs[dateKey]
          const hasSets = Object.values(log?.sets ?? {}).some((s) => s.length)
          if (
            !log ||
            log.finishedAt ||
            !hasSets ||
            !Number.isInteger(rating) ||
            rating < 1 ||
            rating > 10
          )
            return state
          return {
            logs: {
              ...state.logs,
              [dateKey]: {
                ...log,
                rating,
                notes: notes.trim(),
                finishedAt: finishedAt.toISOString(),
              },
            },
          }
        }),
    }),
    {
      name: 'gym-log',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ programmeStart, logs }) => ({ programmeStart, logs }),
    },
  ),
)
