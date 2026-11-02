import {
  DEFAULT_PRAYER_SETTINGS,
  calendarDateInTimeZone,
  decodePrayerHistory,
  formatCityClock,
  formatPrayerTime,
  nextPrayer,
  PRAYERS,
  prayerDayPhase,
  prayerStreak,
  prayerTimes,
  qiblaBearing,
} from '@/lib/prayer'
import { usePrayerLogStore } from '@/stores/PrayerLogStore'
import { useThemeStore } from '@/stores/ThemeStore'

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

describe('prayer settings', () => {
  const day = new Date(2026, 8, 12, 12)

  it('moves Asr later for the Hanafi madhab', () => {
    const shafi = prayerTimes(day).asr!
    const hanafi = prayerTimes(day, {
      ...DEFAULT_PRAYER_SETTINGS,
      madhab: 'hanafi',
    }).asr!
    expect(hanafi.getTime()).toBeGreaterThan(shafi.getTime())
  })

  it('rolls the next prayer over to tomorrow after Isha', () => {
    const isha = prayerTimes(day).isha!
    const next = nextPrayer(new Date(isha.getTime() + 60_000))
    expect(next?.prayer).toBe('fajr')
    expect(next?.time.getTime()).toBe(
      prayerTimes(new Date(2026, 8, 13, 12)).fajr!.getTime(),
    )
  })

  it("keeps yesterday's Isha next when it falls after midnight", () => {
    const isha = prayerTimes(new Date(2026, 7, 20, 12)).isha!
    const now = new Date(isha.getTime() - 60_000)
    expect(calendarDateInTimeZone(now, 'Europe/Helsinki').getDate()).toBe(21)
    expect(nextPrayer(now)).toEqual({ prayer: 'isha', time: isha })
  })

  it('uses the selected city timezone for the clock, prayer labels, and day', () => {
    const location = {
      name: 'Los Angeles, California, USA',
      latitude: 34.0522,
      longitude: -118.2437,
      timezone: 'America/Los_Angeles',
    }
    const now = new Date('2026-10-24T09:30:54.000Z')
    expect(formatCityClock(now, '24h', location.timezone)).toEqual({
      hour: '02',
      minute: '30',
      second: '54',
      period: null,
    })
    expect(formatPrayerTime(now, '12h', location.timezone)).toEqual({
      time: '2:30',
      period: 'am',
    })
    expect(calendarDateInTimeZone(now, location.timezone)).toEqual(
      new Date(2026, 9, 24, 12),
    )
  })

  it('finds the next prayer from the selected city day', () => {
    const settings = {
      ...DEFAULT_PRAYER_SETTINGS,
      location: {
        name: 'Los Angeles, California, USA',
        latitude: 34.0522,
        longitude: -118.2437,
        timezone: 'America/Los_Angeles',
      },
    }
    expect(
      nextPrayer(new Date('2026-09-12T01:00:00.000Z'), settings)?.prayer,
    ).toBe('maghrib')
  })

  it('points Helsinki towards Makkah', () => {
    expect(qiblaBearing(DEFAULT_PRAYER_SETTINGS.location)).toBeCloseTo(158.2, 1)
  })

  it('formats 12- and 24-hour times', () => {
    const time = new Date(2026, 8, 12, 15, 4)
    expect(formatPrayerTime(time, '24h')).toEqual({
      time: '15:04',
      period: null,
    })
    expect(formatPrayerTime(time, '12h')).toEqual({
      time: '3:04',
      period: 'pm',
    })
  })

  it('tracks the selected day solar phases at their exact boundaries', () => {
    const times = {
      sunrise: new Date('2026-09-12T03:00:00.000Z'),
      sunset: new Date('2026-09-12T16:00:00.000Z'),
      night: new Date('2026-09-12T18:00:00.000Z'),
    }
    expect(prayerDayPhase(new Date('2026-09-12T02:59:59.999Z'), times)).toBe(
      'night',
    )
    expect(prayerDayPhase(times.sunrise, times)).toBe('sunrise')
    expect(prayerDayPhase(times.sunset, times)).toBe('sunset')
    expect(prayerDayPhase(times.night, times)).toBe('night')
  })

  it('does not select a phase for historical dates or incomplete solar times', () => {
    expect(
      prayerDayPhase(null, {
        sunrise: new Date(),
        sunset: new Date(),
        night: new Date(),
      }),
    ).toBeNull()
    expect(
      prayerDayPhase(new Date(), {
        sunrise: new Date(),
        sunset: null,
        night: new Date(),
      }),
    ).toBeNull()
  })

  it('rejects invalid settings', () => {
    expect(() =>
      useThemeStore.getState().setPrayer({
        location: {
          ...DEFAULT_PRAYER_SETTINGS.location,
          name: 'Nowhere',
          latitude: 91,
        },
      }),
    ).toThrow()
    expect(() =>
      useThemeStore.getState().setPrayer({
        location: {
          ...DEFAULT_PRAYER_SETTINGS.location,
          timezone: 'Not/A_Timezone',
        },
      }),
    ).toThrow()
    expect(useThemeStore.getState().prayer).toEqual(DEFAULT_PRAYER_SETTINGS)
  })
})

describe('decodePrayerHistory', () => {
  const today = new Date(2026, 8, 12, 9)

  it('decodes one prayer bitmask per day', () => {
    expect(decodePrayerHistory('20260911v.202609125', today)).toEqual({
      '2026-09-11': [...PRAYERS],
      '2026-09-12': ['fajr', 'asr'],
    })
  })

  it.each(['', '20260911', '20260911w', '20260231v', '20260913v', 'x.y'])(
    'rejects %p',
    (text) => expect(decodePrayerHistory(text, today)).toBeNull(),
  )
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

  it('merges imported days without unmarking anything', () => {
    usePrayerLogStore.setState({ prayed: { '2026-09-12': ['isha'] } })
    usePrayerLogStore.getState().merge({
      '2026-09-11': ['dhuhr'],
      '2026-09-12': ['fajr'],
    })
    expect(usePrayerLogStore.getState().prayed).toEqual({
      '2026-09-11': ['dhuhr'],
      '2026-09-12': ['fajr', 'isha'],
    })
  })
})
