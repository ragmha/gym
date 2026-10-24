import {
  CalculationMethod,
  Coordinates,
  HighLatitudeRule,
  Madhab,
  PolarCircleResolution,
  PrayerTimes,
} from 'adhan'

import { localDateKey } from '@/lib/healthSnapshot/dateKey'

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export type Prayer = (typeof PRAYERS)[number]

export const PRAYER_LABELS: Record<Prayer, { en: string; ar: string }> = {
  fajr: { en: 'Fajr', ar: 'الفجر' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
  asr: { en: 'Asr', ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha: { en: 'Isha', ar: 'العشاء' },
}

// ponytail: fixed to the Athan PWA's defaults (Helsinki, Muslim World League,
// Shafi Asr, middle-of-the-night). Add a location permission and settings when
// another city or method is needed.
const HELSINKI = new Coordinates(60.1699, 24.9384)

/** Helsinki times for the local calendar day of `date`; null when not computable. */
export function prayerTimes(date: Date): Record<Prayer, Date | null> {
  const parameters = CalculationMethod.MuslimWorldLeague()
  parameters.madhab = Madhab.Shafi
  parameters.highLatitudeRule = HighLatitudeRule.MiddleOfTheNight
  parameters.polarCircleResolution = PolarCircleResolution.AqrabYaum
  const times = new PrayerTimes(HELSINKI, date, parameters)
  // adhan returns Invalid Date instead of throwing.
  return Object.fromEntries(
    PRAYERS.map((prayer) => {
      const time = times[prayer]
      return [prayer, Number.isNaN(time.getTime()) ? null : time]
    }),
  ) as Record<Prayer, Date | null>
}

/** Consecutive complete days ending on `date`; an unfinished `date` does not break it. */
export function prayerStreak(
  prayed: Readonly<Record<string, readonly Prayer[]>>,
  date: Date,
): number {
  const day = new Date(date)
  day.setHours(12, 0, 0, 0)
  const complete = () => {
    const marked = prayed[localDateKey(day)] ?? []
    return PRAYERS.every((prayer) => marked.includes(prayer))
  }
  if (!complete()) day.setDate(day.getDate() - 1)
  let streak = 0
  while (complete()) {
    streak += 1
    day.setDate(day.getDate() - 1)
  }
  return streak
}
