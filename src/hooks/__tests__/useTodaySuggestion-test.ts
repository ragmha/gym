import {
  type TodaySuggestion,
  computeTodaySuggestion,
} from '../useTodaySuggestion'

import type { ReadinessSummary, ReadinessMetric } from '../useReadiness'
import type { TrainingSession } from '@/lib/training/load'
import type { Pillar } from '@/lib/training/pillars'

function metric(
  value: number,
  baseline: number,
  direction: ReadinessMetric['direction'],
): ReadinessMetric {
  return { value, baseline, delta: value - baseline, direction }
}

function neutralReadiness(): ReadinessSummary {
  return {
    status: 'ready',
    isDemoMode: false,
    hrv: metric(50, 50, 'neutral'),
    restingHeartRate: metric(55, 55, 'neutral'),
    sleepHours: metric(7.5, 7.5, 'neutral'),
    refresh: async () => {},
  }
}

function session(pillar: Pillar, hoursAgo: number, now: Date): TrainingSession {
  return {
    source: 'gym-log',
    pillar,
    startISO: new Date(now.getTime() - hoursAgo * 60 * 60 * 1000).toISOString(),
    durationMinutes: 45,
  }
}

const NOW = new Date('2026-05-16T10:00:00.000Z')

describe('computeTodaySuggestion', () => {
  it('returns REST when two readiness signals are bad', () => {
    const readiness: ReadinessSummary = {
      ...neutralReadiness(),
      hrv: metric(40, 50, 'bad'),
      restingHeartRate: metric(62, 55, 'bad'),
    }
    const result = computeTodaySuggestion({
      readiness,
      sessions: [session('strength', 20, NOW)],
      now: NOW,
    })
    expect(result.kind).toBe('rest')
    expect(result.pillar).toBeNull()
    expect(result.headline).toBe('Rest')
  })

  it('suggests MOBILITY when sleep deficit exceeds 1.5h regardless of other signals', () => {
    const readiness: ReadinessSummary = {
      ...neutralReadiness(),
      sleepHours: metric(5.5, 7.5, 'bad'),
    }
    const result = computeTodaySuggestion({
      readiness,
      sessions: [session('strength', 20, NOW)],
      now: NOW,
    })
    expect(result.kind).toBe('mobility')
    expect(result.headline.toLowerCase()).toContain('mobility')
  })

  it('falls through to easy ZONE 2 when RHR is elevated > +5bpm', () => {
    const readiness: ReadinessSummary = {
      ...neutralReadiness(),
      restingHeartRate: metric(63, 55, 'bad'),
    }
    const result = computeTodaySuggestion({
      readiness,
      sessions: [session('run', 20, NOW)],
      now: NOW,
    })
    expect(result.pillar).toBe<Pillar>('conditioning')
    expect(result.headline.toLowerCase()).toContain('zone 2')
  })

  it('suggests STRENGTH when nothing logged in last 48h', () => {
    const result = computeTodaySuggestion({
      readiness: neutralReadiness(),
      sessions: [session('run', 72, NOW)],
      now: NOW,
    })
    expect(result.pillar).toBe<Pillar>('strength')
    expect(result.reason.toLowerCase()).toContain('days')
  })

  it('suggests STRENGTH when no sessions exist at all', () => {
    const result = computeTodaySuggestion({
      readiness: neutralReadiness(),
      sessions: [],
      now: NOW,
    })
    expect(result.pillar).toBe<Pillar>('strength')
  })

  it.each<[Pillar, Pillar]>([
    ['strength', 'run'],
    ['run', 'strength'],
    ['conditioning', 'strength'],
  ])(
    'alternates from %s → %s when readiness is neutral',
    (lastPillar, expected) => {
      const result: TodaySuggestion = computeTodaySuggestion({
        readiness: neutralReadiness(),
        sessions: [session(lastPillar, 20, NOW)],
        now: NOW,
      })
      expect(result.pillar).toBe(expected)
    },
  )

  it('prioritises rest rule over the alternation rule', () => {
    const readiness: ReadinessSummary = {
      ...neutralReadiness(),
      hrv: metric(40, 50, 'bad'),
      sleepHours: metric(6, 7.5, 'bad'),
    }
    const result = computeTodaySuggestion({
      readiness,
      sessions: [session('strength', 20, NOW)],
      now: NOW,
    })
    expect(result.kind).toBe('rest')
  })
})
