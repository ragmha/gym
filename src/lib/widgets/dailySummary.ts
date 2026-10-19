import { DAILY_STEP_GOAL } from '@/lib/dailyGoals'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

export interface DailySummaryProps {
  readings: {
    label: string
    value: string
    target: string
    available: boolean
    progress: number
    color: string
  }[]
  updatedAt: string
  expiresAt: number
}

export function dailySummaryTimeline(
  snapshot: DailyHealthSnapshot | null,
  now = new Date(),
) {
  const current = snapshot?.date === localDateKey(now) ? snapshot : null
  const values = [
    {
      label: 'STEPS',
      value: current?.steps,
      goal: DAILY_STEP_GOAL,
      target: '20,000',
      color: '#83D7AB',
    },
    {
      label: 'WATER',
      value: current?.waterLiters,
      goal: 2.5,
      target: '2.5 L',
      color: '#8AB4FF',
    },
    {
      label: 'ACTIVE KCAL',
      value: current?.calories,
      goal: 500,
      target: '500 kcal',
      color: '#EF7171',
    },
  ]
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const expiresAt = Math.min(now.getTime() + 60 * 60_000, midnight.getTime())
  const props: DailySummaryProps = {
    readings: values.map(({ value, goal, ...reading }) => {
      const valid = value != null && Number.isFinite(value) && value >= 0
      return {
        ...reading,
        value: valid
          ? value.toLocaleString(undefined, {
              maximumFractionDigits: reading.label === 'WATER' ? 2 : 0,
            })
          : '--',
        available: valid,
        progress: valid ? Math.min(value / goal, 1) : 0,
      }
    }),
    updatedAt: current
      ? now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
    expiresAt,
  }
  const expired: DailySummaryProps = {
    readings: props.readings.map((reading) => ({
      ...reading,
      value: '--',
      available: false,
      progress: 0,
    })),
    updatedAt: '',
    expiresAt: 0,
  }
  return [
    { date: now, props },
    { date: new Date(expiresAt), props: expired },
  ]
}
