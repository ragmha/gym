import { makeSnapshot } from '@/components/dashboard/__fixtures__/healthSnapshot'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { dailySummaryTimeline } from '@/lib/widgets/dailySummary'

describe('dailySummaryTimeline', () => {
  const now = new Date(2026, 9, 18, 14, 30)
  const snapshot = makeSnapshot({
    date: localDateKey(now),
    steps: 10_000,
    waterLiters: 1.25,
    calories: 250,
  })

  it('shares only the three approved current-day readings and display targets', () => {
    const [current, expired] = dailySummaryTimeline(snapshot, now)
    expect(current.date).toEqual(now)
    expect(current.props.readings.map((reading) => reading.progress)).toEqual([
      0.5, 0.5, 0.5,
    ])
    expect(current.props.readings.map((reading) => reading.target)).toEqual([
      '20,000',
      '2.5 L',
      '500 kcal',
    ])
    expect(Object.keys(current.props).sort()).toEqual([
      'expiresAt',
      'readings',
      'updatedAt',
    ])
    expect(JSON.stringify([current.props, expired.props])).not.toContain('null')
    expect(current.props.updatedAt).not.toBe('')
    expect(expired.date.getTime() - now.getTime()).toBe(60 * 60_000)
    expect(expired.props.updatedAt).toBe('')
    expect(
      expired.props.readings.every((reading) => reading.value === '--'),
    ).toBe(true)
    expect(
      expired.props.readings.every(
        (reading) => !reading.available && reading.progress === 0,
      ),
    ).toBe(true)
  })

  it('preserves observed zeroes and caps rings without capping displayed values', () => {
    const [entry] = dailySummaryTimeline(
      { ...snapshot, steps: 0, waterLiters: 3, calories: 750 },
      now,
    )
    expect(entry.props.readings.map((reading) => reading.progress)).toEqual([
      0, 1, 1,
    ])
    expect(entry.props.readings.map((reading) => reading.value)).toEqual([
      '0',
      '3',
      '750',
    ])
    expect(entry.props.readings.every((reading) => reading.available)).toBe(
      true,
    )
  })

  it.each([null, -1, NaN, Infinity])(
    'shows unavailable rather than inventing progress for %s',
    (value) => {
      const [entry] = dailySummaryTimeline(
        { ...snapshot, steps: value, waterLiters: value, calories: value },
        now,
      )
      expect(
        entry.props.readings.every((reading) => reading.value === '--'),
      ).toBe(true)
      expect(
        entry.props.readings.every(
          (reading) => !reading.available && reading.progress === 0,
        ),
      ).toBe(true)
    },
  )

  it.each([
    null,
    { ...snapshot, date: '2026-10-17' },
    { ...snapshot, date: '2026-10-19' },
  ])('never publishes readings from an absent or different day', (input) => {
    const [entry] = dailySummaryTimeline(input, now)
    expect(entry.props.updatedAt).toBe('')
    expect(
      entry.props.readings.every((reading) => reading.value === '--'),
    ).toBe(true)
  })

  it('expires at local midnight rather than carrying yesterday into today', () => {
    const late = new Date(2026, 9, 18, 23, 50)
    const [, expired] = dailySummaryTimeline(snapshot, late)
    expect(expired.date).toEqual(new Date(2026, 9, 19))
    expect(expired.props.expiresAt).toBe(0)
  })
})
