import type { Pillar } from '../pillars'
import {
  aggregateWeekly,
  buildDailyBars,
  calibrateTargets,
  computeACWR,
  FALLBACK_WEEKLY_TARGETS,
  localDateKey,
  startOfWeekMonday,
  type TrainingSession,
} from '../load'

// All test dates use a fixed reference week to keep the test deterministic.
// Reference NOW = Friday 2026-05-15 09:00 local.
const NOW = new Date('2026-05-15T09:00:00')

function session(
  pillar: Pillar,
  startISO: string,
  minutes: number,
  distanceMeters?: number,
): TrainingSession {
  return {
    source: pillar === 'strength' ? 'gym-log' : 'healthkit',
    pillar,
    startISO,
    durationMinutes: minutes,
    distanceMeters,
  }
}

describe('startOfWeekMonday', () => {
  it('returns Monday for a Friday', () => {
    const mon = startOfWeekMonday(NOW)
    expect(mon.getDay()).toBe(1)
    expect(localDateKey(mon)).toBe('2026-05-11')
  })

  it('returns the same Monday when called on a Sunday', () => {
    const sun = new Date('2026-05-17T12:00:00')
    const mon = startOfWeekMonday(sun)
    expect(localDateKey(mon)).toBe('2026-05-11')
  })

  it('returns Monday for a Monday', () => {
    const mon = new Date('2026-05-11T06:00:00')
    const result = startOfWeekMonday(mon)
    expect(localDateKey(result)).toBe('2026-05-11')
    expect(result.getHours()).toBe(0)
  })
})

describe('aggregateWeekly', () => {
  it('sums minutes per pillar for the current week only', () => {
    const sessions: TrainingSession[] = [
      // This week (Mon 5/11 → Fri 5/15)
      session('strength', '2026-05-11T07:00:00', 60),
      session('strength', '2026-05-13T07:00:00', 45),
      session('run', '2026-05-12T18:00:00', 40, 6500),
      session('conditioning', '2026-05-14T19:00:00', 30, 5000),
      // Last week (4-5 to 5-10) — should NOT count toward "this week"
      session('strength', '2026-05-04T07:00:00', 100),
      session('run', '2026-05-08T18:00:00', 30, 5000),
      // Before — outside both windows
      session('conditioning', '2026-04-28T07:00:00', 60),
    ]

    const weekly = aggregateWeekly(sessions, NOW)
    const byPillar = Object.fromEntries(weekly.map((w) => [w.pillar, w]))

    expect(byPillar.strength.minutes).toBe(105)
    expect(byPillar.strength.sessionCount).toBe(2)
    expect(byPillar.run.minutes).toBe(40)
    expect(byPillar.run.distanceMeters).toBe(6500)
    expect(byPillar.conditioning.minutes).toBe(30)
  })

  it('returns positive vsLastWeekMinutes when this week is heavier', () => {
    const sessions: TrainingSession[] = [
      session('strength', '2026-05-11T07:00:00', 60), // this week
      session('strength', '2026-05-04T07:00:00', 30), // last week
    ]
    const weekly = aggregateWeekly(sessions, NOW)
    const strength = weekly.find((w) => w.pillar === 'strength')!
    expect(strength.vsLastWeekMinutes).toBe(30)
  })

  it('returns negative vsLastWeekMinutes when this week is lighter', () => {
    const sessions: TrainingSession[] = [
      session('run', '2026-05-11T07:00:00', 20),
      session('run', '2026-05-04T07:00:00', 60),
    ]
    const weekly = aggregateWeekly(sessions, NOW)
    const run = weekly.find((w) => w.pillar === 'run')!
    expect(run.vsLastWeekMinutes).toBe(-40)
  })

  it('returns zeroes for pillars with no sessions', () => {
    const weekly = aggregateWeekly([], NOW)
    expect(weekly).toHaveLength(3)
    for (const w of weekly) {
      expect(w.minutes).toBe(0)
      expect(w.sessionCount).toBe(0)
      expect(w.vsLastWeekMinutes).toBe(0)
    }
  })
})

describe('buildDailyBars', () => {
  it('returns N days with the most recent last, including empty days', () => {
    const sessions: TrainingSession[] = [
      session('strength', '2026-05-13T07:00:00', 60),
      session('run', '2026-05-15T06:30:00', 30),
    ]
    const bars = buildDailyBars(sessions, NOW, 5)
    expect(bars).toHaveLength(5)
    expect(bars[0].dateISO).toBe('2026-05-11')
    expect(bars[4].dateISO).toBe('2026-05-15')

    expect(bars[2].strength).toBe(60) // Wed 5/13
    expect(bars[2].run).toBe(0)
    expect(bars[4].run).toBe(30) // Fri 5/15
    expect(bars[4].strength).toBe(0)
    expect(bars[0]).toEqual({
      dateISO: '2026-05-11',
      strength: 0,
      run: 0,
      conditioning: 0,
    })
  })
})

describe('calibrateTargets', () => {
  it('returns fallback when there is no training history', () => {
    const result = calibrateTargets([], NOW)
    expect(result.source).toBe('fallback')
    expect(result.weeksObserved).toBe(0)
    expect(result.strengthMinutes).toBe(FALLBACK_WEEKLY_TARGETS.strengthMinutes)
    expect(result.runMinutes).toBe(FALLBACK_WEEKLY_TARGETS.runMinutes)
  })

  it('blends real average with fallback for 1–3 weeks of history', () => {
    // 2 weeks of consistent strength (90 min/wk avg) blends real avg with
    // fallback: 90 × 0.5 + 180 × 0.5 = 135.
    const sessions: TrainingSession[] = [
      session('strength', '2026-05-04T07:00:00', 90), // last week
      session('strength', '2026-04-27T07:00:00', 90), // 2 weeks ago
    ]
    const result = calibrateTargets(sessions, NOW)
    expect(result.source).toBe('partial')
    expect(result.weeksObserved).toBe(2)
    expect(result.strengthMinutes).toBe(135)
  })

  it('uses trailing 4-week average + 10% progression once calibrated', () => {
    const fourWeekSessions: TrainingSession[] = [
      // Each prior week has the same 60 min of run
      session('run', '2026-05-04T07:00:00', 60),
      session('run', '2026-04-27T07:00:00', 60),
      session('run', '2026-04-20T07:00:00', 60),
      session('run', '2026-04-13T07:00:00', 60),
    ]
    const result = calibrateTargets(fourWeekSessions, NOW)
    expect(result.source).toBe('calibrated')
    expect(result.weeksObserved).toBe(4)
    // avg = 60, +10% progression = 66
    expect(result.runMinutes).toBe(66)
  })
})

describe('computeACWR', () => {
  it('marks unavailable when there is no chronic load', () => {
    const result = computeACWR([], NOW)
    expect(result.value).toBeNull()
    expect(result.status).toBe('unavailable')
    expect(result.acuteMinutes).toBe(0)
    expect(result.chronicMinutes).toBe(0)
  })

  it('marks unavailable when chronic baseline is below 60 minutes', () => {
    // Only 30 minutes across the last 28 days → meaningless baseline.
    const sessions: TrainingSession[] = [
      session('run', '2026-04-25T07:00:00', 30),
    ]
    const result = computeACWR(sessions, NOW)
    expect(result.status).toBe('unavailable')
    expect(result.value).toBeNull()
  })

  it('returns optimal when acute ≈ chronic average', () => {
    // 60 min × 4 weeks → chronic = 60. Last 7 days = 60.
    const sessions: TrainingSession[] = [
      session('run', '2026-04-20T07:00:00', 60),
      session('run', '2026-04-27T07:00:00', 60),
      session('run', '2026-05-04T07:00:00', 60),
      session('run', '2026-05-13T07:00:00', 60), // within last 7d
    ]
    const result = computeACWR(sessions, NOW)
    expect(result.acuteMinutes).toBe(60)
    expect(result.chronicMinutes).toBe(60)
    expect(result.value).toBe(1)
    expect(result.status).toBe('optimal')
  })

  it('flags high when acute spikes vs chronic', () => {
    const sessions: TrainingSession[] = [
      session('run', '2026-04-20T07:00:00', 60),
      session('run', '2026-04-27T07:00:00', 60),
      session('run', '2026-05-04T07:00:00', 60),
      // Massive acute spike this week
      session('run', '2026-05-13T07:00:00', 240),
      session('run', '2026-05-14T07:00:00', 120),
    ]
    const result = computeACWR(sessions, NOW)
    expect(result.status).toBe('high')
    expect(result.value).toBeGreaterThan(1.3)
  })

  it('flags low when athlete has detrained relative to baseline', () => {
    const sessions: TrainingSession[] = [
      // Heavy chronic load — 4 hours × 3 weeks
      session('run', '2026-04-20T07:00:00', 240),
      session('run', '2026-04-27T07:00:00', 240),
      session('run', '2026-05-04T07:00:00', 240),
      // Light acute load
      session('run', '2026-05-13T07:00:00', 20),
    ]
    const result = computeACWR(sessions, NOW)
    expect(result.status).toBe('low')
    expect(result.value).toBeLessThan(0.8)
  })
})
