import { buildAchievements, type Badge } from '@/lib/achievements'
import type { HealthWorkout } from '@/lib/healthSnapshot/types'

const workout = (overrides: Partial<HealthWorkout> = {}): HealthWorkout => ({
  kind: 'running',
  activityName: 'Running',
  averageHeartRate: null,
  calories: 300,
  distance: null,
  durationMinutes: 30,
  startISO: '2026-02-01T07:00:00.000Z',
  endISO: '2026-02-01T07:30:00.000Z',
  ...overrides,
})

function badges(input: Partial<Parameters<typeof buildAchievements>[0]>) {
  const all = buildAchievements({
    steps: [],
    water: [],
    workouts: [],
    gymLogs: {},
    ...input,
  }).flatMap((section) => section.badges)
  return (id: string) => all.find((badge) => badge.id === id) as Badge
}

describe('buildAchievements', () => {
  it('locks every badge when there is no data', () => {
    const sections = buildAchievements({
      steps: [{ date: '2026-02-01', steps: null }],
      water: [{ date: '2026-02-01', liters: 0 }],
      workouts: [{ date: '2026-02-01', workouts: [] }],
      gymLogs: {},
    })
    expect(sections.map((s) => s.title)).toEqual([
      'Personal records',
      'Steps',
      'Streaks',
      'Workouts',
      'Lifting',
      'Hydration',
    ])
    expect(sections.flatMap((s) => s.badges).every((b) => !b.date)).toBe(true)
  })

  it('dates records, thresholds and streaks by the first day they happened', () => {
    const get = badges({
      steps: [
        { date: '2026-02-01', steps: 21_000 },
        { date: '2026-02-02', steps: 21_000 },
        { date: '2026-02-03', steps: null },
        { date: '2026-02-04', steps: 20_000 },
        { date: '2026-02-05', steps: 20_500 },
        { date: '2026-02-06', steps: 20_000 },
      ],
    })
    expect(get('most-steps')).toMatchObject({
      date: '2026-02-01',
      value: (21_000).toLocaleString(),
    })
    expect(get('steps-20000').date).toBe('2026-02-01')
    expect(get('steps-25000')).toMatchObject({
      date: null,
      progress: { current: 21_000, target: 25_000 },
    })
    // A missing day breaks the streak rather than counting as a hit.
    expect(get('goal-streak-3').date).toBe('2026-02-06')
  })

  it('counts workout and lifting milestones with progress', () => {
    const get = badges({
      workouts: [
        {
          date: '2026-02-01',
          workouts: [workout(), workout({ kind: 'strength' })],
        },
        { date: '2026-02-02', workouts: [workout({ durationMinutes: 45.9 })] },
      ],
      gymLogs: {
        '2026-02-02': {
          day: 'A',
          sets: {
            squat: [
              { reps: 5, kilograms: 100 },
              { reps: 8, kilograms: null },
            ],
          },
          finishedAt: '2026-02-02T08:00:00.000Z',
          rating: 4,
          notes: '',
        },
      },
    })
    expect(get('workouts-1').date).toBe('2026-02-01')
    expect(get('workouts-10').progress).toEqual({ current: 3, target: 10 })
    expect(get('longest-run')).toMatchObject({
      date: '2026-02-02',
      value: '45 min',
    })
    expect(get('lifts-1').date).toBe('2026-02-02')
    expect(get('heaviest-set').value).toBe('100 kg')
    expect(get('sets-100').progress).toEqual({ current: 2, target: 100 })
  })
})
