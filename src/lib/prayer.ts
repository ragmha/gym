import {
  CalculationMethod,
  Coordinates,
  PolarCircleResolution,
  PrayerTimes,
  Qibla,
} from 'adhan'
import { z } from 'zod'

import { localDateKey } from '@/lib/healthSnapshot/dateKey'

export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export type Prayer = (typeof PRAYERS)[number]
export type PrayerDayTimes = Record<Prayer, Date | null> & {
  sunrise: Date | null
  sunset: Date | null
  night: Date | null
}
export type PrayerDayPhase = 'sunrise' | 'sunset' | 'night'

export const PRAYER_LABELS: Record<Prayer, { en: string; ar: string }> = {
  fajr: { en: 'Fajr', ar: 'الفجر' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
  asr: { en: 'Asr', ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha: { en: 'Isha', ar: 'العشاء' },
}

export const PRAYER_METHODS = {
  MuslimWorldLeague: 'Muslim World League',
  Egyptian: 'Egyptian',
  Karachi: 'Karachi',
  UmmAlQura: 'Umm al-Qura',
  Dubai: 'Dubai',
  MoonsightingCommittee: 'Moonsighting Committee',
  NorthAmerica: 'ISNA',
  Kuwait: 'Kuwait',
  Qatar: 'Qatar',
  Singapore: 'Singapore',
  Tehran: 'Tehran',
  Turkey: 'Turkey',
} as const
export type PrayerMethod = keyof typeof PRAYER_METHODS

export const HIGH_LATITUDE_RULES = {
  middleofthenight: 'Middle of the night',
  seventhofthenight: 'Seventh of the night',
  twilightangle: 'Twilight angle',
} as const

export const prayerLocationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .refine((timezone) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(0)
        return true
      } catch {
        return false
      }
    }),
})
export type PrayerLocation = z.infer<typeof prayerLocationSchema>

export const prayerSettingsSchema = z.object({
  location: prayerLocationSchema,
  method: z.enum(
    Object.keys(PRAYER_METHODS) as [PrayerMethod, ...PrayerMethod[]],
  ),
  madhab: z.enum(['shafi', 'hanafi']),
  highLatitudeRule: z.enum(
    Object.keys(HIGH_LATITUDE_RULES) as [
      keyof typeof HIGH_LATITUDE_RULES,
      ...(keyof typeof HIGH_LATITUDE_RULES)[],
    ],
  ),
  clock: z.enum(['24h', '12h']),
  reminders: z.boolean(),
})
export type PrayerSettings = z.infer<typeof prayerSettingsSchema>

/** The Athan PWA's defaults. */
export const DEFAULT_PRAYER_SETTINGS: PrayerSettings = {
  location: {
    name: 'Helsinki, Finland',
    latitude: 60.1699,
    longitude: 24.9384,
    timezone: 'Europe/Helsinki',
  },
  method: 'MuslimWorldLeague',
  madhab: 'shafi',
  highLatitudeRule: 'middleofthenight',
  clock: '24h',
  reminders: false,
}

/** Calendar day at the selected location, represented at local noon. */
export function calendarDateInTimeZone(date: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((value) => value.type === type)?.value)
  return new Date(part('year'), part('month') - 1, part('day'), 12)
}

function formattedTimeParts(
  date: Date,
  clock: PrayerSettings['clock'],
  timeZone: string,
  includeSeconds: boolean,
) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' as const } : {}),
    hourCycle: clock === '24h' ? 'h23' : 'h12',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00'
  const dayPeriod = value('dayPeriod')
  const period: 'am' | 'pm' | null =
    dayPeriod === 'AM' ? 'am' : dayPeriod === 'PM' ? 'pm' : null
  return {
    hour: value('hour'),
    minute: value('minute'),
    second: includeSeconds ? value('second') : null,
    period,
  }
}

export function formatCityClock(
  date: Date,
  clock: PrayerSettings['clock'],
  timeZone: string,
) {
  return formattedTimeParts(date, clock, timeZone, true)
}

/** Times for the local calendar day of `date`; null when not computable. */
export function prayerTimes(
  date: Date,
  settings: PrayerSettings = DEFAULT_PRAYER_SETTINGS,
): PrayerDayTimes {
  const parameters = CalculationMethod[settings.method]()
  parameters.madhab = settings.madhab
  parameters.highLatitudeRule = settings.highLatitudeRule
  parameters.polarCircleResolution = PolarCircleResolution.AqrabYaum
  const { latitude, longitude } = settings.location
  const times = new PrayerTimes(
    new Coordinates(latitude, longitude),
    date,
    parameters,
  )
  // adhan returns Invalid Date instead of throwing.
  const prayerTimes = Object.fromEntries(
    PRAYERS.map((prayer) => {
      const time = times[prayer]
      return [prayer, Number.isNaN(time.getTime()) ? null : time]
    }),
  ) as Record<Prayer, Date | null>
  const validTime = (time: Date) => (Number.isNaN(time.getTime()) ? null : time)
  return {
    ...prayerTimes,
    sunrise: validTime(times.sunrise),
    sunset: validTime(times.maghrib),
    night: validTime(times.isha),
  }
}

/** Maps the calculated sunrise, sunset, and Isha boundaries to the active scene. */
export function prayerDayPhase(
  now: Date | null,
  times: Pick<PrayerDayTimes, 'sunrise' | 'sunset' | 'night'>,
): PrayerDayPhase | null {
  if (now === null || !times.sunrise || !times.sunset || !times.night) {
    return null
  }
  if (now < times.sunrise || now >= times.night) return 'night'
  return now < times.sunset ? 'sunrise' : 'sunset'
}

/** The first prayer after `now`; yesterday's Isha can fall after midnight. */
export function nextPrayer(
  now: Date,
  settings: PrayerSettings = DEFAULT_PRAYER_SETTINGS,
): { prayer: Prayer; time: Date } | null {
  for (const offset of [-1, 0, 1]) {
    const day = calendarDateInTimeZone(now, settings.location.timezone)
    day.setDate(day.getDate() + offset)
    const times = prayerTimes(day, settings)
    for (const prayer of PRAYERS) {
      const time = times[prayer]
      if (time && time > now) return { prayer, time }
    }
  }
  return null
}

/** Degrees clockwise from true north towards the Kaaba. */
export function qiblaBearing(location: PrayerLocation): number {
  return Qibla(new Coordinates(location.latitude, location.longitude))
}

export function formatPrayerTime(
  time: Date | null,
  clock: PrayerSettings['clock'],
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
): { time: string; period: 'am' | 'pm' | null } {
  if (time === null) return { time: '--', period: null }
  const parts = formattedTimeParts(time, clock, timeZone, false)
  return {
    time:
      clock === '24h'
        ? `${parts.hour}:${parts.minute}`
        : `${Number(parts.hour)}:${parts.minute}`,
    period: parts.period,
  }
}

const IMPORT_ENTRY = /^(\d{4})(\d{2})(\d{2})([1-9a-v])$/
const MAX_IMPORT_DAYS = 3660

/**
 * Parses the Athan PWA export: `.`-separated `YYYYMMDD` + one base-32 digit
 * whose bits mark Fajr..Isha. Null when any entry is invalid or in the future.
 */
export function decodePrayerHistory(
  text: string,
  today: Date = new Date(),
): Record<string, Prayer[]> | null {
  const entries = text.split('.')
  if (!text || entries.length > MAX_IMPORT_DAYS) return null
  const todayKey = localDateKey(today)
  const days: Record<string, Prayer[]> = {}
  for (const entry of entries) {
    const match = IMPORT_ENTRY.exec(entry)
    if (!match) return null
    const [, year, month, day, digit] = match
    const date = new Date(Number(year), Number(month) - 1, Number(day), 12)
    const key = `${year}-${month}-${day}`
    if (localDateKey(date) !== key || key > todayKey) return null
    const mask = parseInt(digit, 32)
    days[key] = PRAYERS.filter((_, index) => mask & (1 << index))
  }
  return days
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
