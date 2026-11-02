import * as Notifications from 'expo-notifications'

import { DEFAULT_PRAYER_SETTINGS } from '@/lib/prayer'
import { prayerNativeSupport } from '@/lib/prayerLocation'
import { reminderSchedule, syncPrayerReminders } from '@/lib/prayerReminders'

jest.mock('expo', () => ({
  requireOptionalNativeModule: jest.fn(() => ({})),
}))
jest.mock('@/lib/prayerLocation', () => ({
  prayerNativeSupport: jest.fn(() => ({ available: true })),
}))
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
}))

const now = new Date(2026, 8, 12, 12)
const on = { ...DEFAULT_PRAYER_SETTINGS, reminders: true }

describe('reminderSchedule', () => {
  it('schedules only future prayers within the iOS limit', () => {
    const reminders = reminderSchedule(now, on)
    expect(reminders.length).toBeGreaterThan(0)
    expect(reminders.length).toBeLessThanOrEqual(60)
    expect(reminders.every(({ date }) => date > now)).toBe(true)
    expect(reminders).toEqual(
      [...reminders].sort((a, b) => a.date.getTime() - b.date.getTime()),
    )
  })

  it('starts from the selected city calendar day', () => {
    const settings = {
      ...on,
      location: {
        name: 'Los Angeles, California, USA',
        latitude: 34.0522,
        longitude: -118.2437,
        timezone: 'America/Los_Angeles',
      },
    }
    const reminders = reminderSchedule(
      new Date('2026-09-12T01:00:00.000Z'),
      settings,
    )
    expect(reminders[0].id).toBe('prayer-2026-09-11-maghrib')
  })
})

describe('syncPrayerReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValue([
        { identifier: 'prayer-old' },
        { identifier: 'other' },
      ] as never)
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ granted: false } as never)
    jest
      .mocked(Notifications.requestPermissionsAsync)
      .mockResolvedValue({ granted: true } as never)
  })

  it('replaces only prayer reminders after asking for permission', async () => {
    await expect(syncPrayerReminders(on, { request: true, now })).resolves.toBe(
      'on',
    )
    expect(
      Notifications.cancelScheduledNotificationAsync,
    ).toHaveBeenCalledTimes(1)
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'prayer-old',
    )
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(
      reminderSchedule(now, on).length,
    )
  })

  it('does not ask for permission in the background', async () => {
    await expect(syncPrayerReminders(on, { now })).resolves.toBe('denied')
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled()
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
  })

  it('cancels reminders when they are turned off', async () => {
    await expect(
      syncPrayerReminders(DEFAULT_PRAYER_SETTINGS, { now }),
    ).resolves.toBe('off')
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled()
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled()
  })

  it('cancels a partial schedule when scheduling fails', async () => {
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue({ granted: true } as never)
    jest
      .mocked(Notifications.scheduleNotificationAsync)
      .mockResolvedValueOnce('prayer-first')
      .mockRejectedValueOnce(new Error('schedule failed'))
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ identifier: 'prayer-first' }] as never)

    await expect(syncPrayerReminders(on, { now })).rejects.toThrow(
      'schedule failed',
    )
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'prayer-first',
    )
  })

  it('fails closed on builds without the native modules', async () => {
    jest.mocked(prayerNativeSupport).mockReturnValueOnce({
      available: false,
      reason: 'build-required',
      message: 'A new iOS build is required.',
    })
    await expect(syncPrayerReminders(on, { now })).resolves.toBe('unsupported')
    expect(
      Notifications.getAllScheduledNotificationsAsync,
    ).not.toHaveBeenCalled()
  })
})
