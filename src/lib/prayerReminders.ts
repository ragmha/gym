import { requireOptionalNativeModule } from 'expo'

import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import {
  calendarDateInTimeZone,
  PRAYER_LABELS,
  PRAYERS,
  prayerTimes,
  type PrayerSettings,
} from '@/lib/prayer'
import { prayerNativeSupport } from '@/lib/prayerLocation'

const ID_PREFIX = 'prayer-'
// iOS keeps only 64 pending local notifications per app.
const MAX_REMINDERS = 60

export type ReminderStatus = 'on' | 'off' | 'denied' | 'unsupported'

let queue: Promise<unknown> = Promise.resolve()

export function reminderSchedule(
  now: Date,
  settings: PrayerSettings,
  days = 12,
): { id: string; title: string; date: Date }[] {
  const reminders = []
  const firstDay = calendarDateInTimeZone(now, settings.location.timezone)
  // Start a day early: yesterday's Isha can fall after midnight.
  for (let offset = -1; offset < days; offset += 1) {
    const day = new Date(firstDay)
    day.setDate(day.getDate() + offset)
    const times = prayerTimes(day, settings)
    for (const prayer of PRAYERS) {
      const date = times[prayer]
      if (date && date > now) {
        reminders.push({
          id: `${ID_PREFIX}${localDateKey(day)}-${prayer}`,
          title: `${PRAYER_LABELS[prayer].en} · ${PRAYER_LABELS[prayer].ar}`,
          date,
        })
      }
    }
  }
  return reminders.slice(0, MAX_REMINDERS)
}

/**
 * Replaces this app's pending prayer reminders with the next ~12 days of local
 * notifications. Only asks for permission when `request` is set. Calls run in
 * order so an older sync never overwrites a newer one.
 */
export function syncPrayerReminders(
  settings: PrayerSettings,
  options: { request?: boolean; now?: Date } = {},
): Promise<ReminderStatus> {
  const run = queue.then(() => sync(settings, options))
  queue = run.catch(() => undefined)
  return run
}
async function sync(
  settings: PrayerSettings,
  { request = false, now = new Date() }: { request?: boolean; now?: Date },
): Promise<ReminderStatus> {
  if (
    !prayerNativeSupport('Schedule prayer reminders').available ||
    !requireOptionalNativeModule('ExpoNotificationScheduler')
  ) {
    return 'unsupported'
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Notifications: typeof import('expo-notifications') = require('expo-notifications')
  const cancelPending = async () => {
    const pending = await Notifications.getAllScheduledNotificationsAsync()
    await Promise.all(
      pending
        .filter(({ identifier }) => identifier.startsWith(ID_PREFIX))
        .map(({ identifier }) =>
          Notifications.cancelScheduledNotificationAsync(identifier),
        ),
    )
  }
  await cancelPending()
  if (!settings.reminders) return 'off'

  let { granted } = await Notifications.getPermissionsAsync()
  if (!granted && request) {
    ;({ granted } = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true },
    }))
  }
  if (!granted) return 'denied'

  try {
    for (const reminder of reminderSchedule(now, settings)) {
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: {
          title: reminder.title,
          body: `Time to pray · ${settings.location.name}`,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.date,
        },
      })
    }
  } catch (error) {
    // Never leave a partial schedule behind a failed opt-in.
    await cancelPending()
    throw error
  }
  return 'on'
}
