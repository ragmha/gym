import { PRAYERS, prayerStreak, prayerTimes } from '@/lib/prayer'
import { usePrayerLogStore } from '@/stores/PrayerLogStore'

const iso = (times: ReturnType<typeof prayerTimes>) =>
  PRAYERS.map((prayer) => times[prayer]?.toISOString())

describe('prayerTimes', () => {
  // Expected values come from the Athan PWA's getDayTimes with its defaults.
  it.each([
    [
      new Date(2026, 8, 12, 12),
      [
        '2026-09-12T01:02:00.000Z',
        '2026-09-12T10:18:00.000Z',
        '2026-09-12T13:40:00.000Z',
        '2026-09-12T16:51:00.000Z',
        '2026-09-12T19:17:00.000Z',
      ],
    ],
    [
      new Date(2026, 5, 21, 12),
      [
        '2026-06-20T22:22:00.000Z',
        '2026-06-21T10:23:00.000Z',
        '2026-06-21T15:04:00.000Z',
        '2026-06-21T19:50:00.000Z',
        '2026-06-21T22:22:00.000Z',
      ],
    ],
  ])('matches the Athan PWA for Helsinki on %s', (date, expected) => {
    expect(iso(prayerTimes(date))).toEqual(expected)
  })
})

describe('prayerStreak', () => {
  const all = [...PRAYERS]
  const today = new Date(2026, 8, 12, 9)

  it('counts complete days and ignores an unfinished today', () => {
    const prayed = {
      '2026-09-12': ['fajr' as const],
      '2026-09-11': all,
      '2026-09-10': all,
      '2026-09-08': all,
    }
    expect(prayerStreak(prayed, today)).toBe(2)
    expect(
      prayerStreak({ ...prayed, '2026-09-12': all }, new Date(2026, 8, 12, 23)),
    ).toBe(3)
  })

  it('is zero when yesterday was missed', () => {
    expect(prayerStreak({ '2026-09-10': all }, today)).toBe(0)
  })
})

describe('usePrayerLogStore', () => {
  afterEach(() => usePrayerLogStore.setState({ prayed: {} }))

  it('toggles prayers in prayer order and drops empty days', () => {
    const { toggle } = usePrayerLogStore.getState()
    toggle('2026-09-12', 'isha')
    toggle('2026-09-12', 'fajr')
    expect(usePrayerLogStore.getState().prayed).toEqual({
      '2026-09-12': ['fajr', 'isha'],
    })
    toggle('2026-09-12', 'isha')
    toggle('2026-09-12', 'fajr')
    expect(usePrayerLogStore.getState().prayed).toEqual({})
  })
})
