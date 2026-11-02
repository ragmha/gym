import { useEffect } from 'react'
import { AppState } from 'react-native'

import { prayerNativeSupport } from '@/lib/prayerLocation'
import { syncPrayerReminders } from '@/lib/prayerReminders'
import { useThemeStore } from '@/stores/ThemeStore'

/**
 * Keeps the rolling 12-day window of prayer reminders scheduled while they are
 * on. Turning them off is handled by the settings screen, which cancels them.
 */
export function usePrayerReminders() {
  const settings = useThemeStore((state) => state.prayer)
  useEffect(() => {
    if (!settings.reminders) return
    if (!prayerNativeSupport('Schedule prayer reminders').available) return
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications: typeof import('expo-notifications') = require('expo-notifications')
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    })
    const sync = () =>
      void syncPrayerReminders(settings).catch((error: unknown) => {
        console.warn('[PrayerReminders] Unable to sync notifications', error)
      })
    sync()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync()
    })
    return () => subscription.remove()
  }, [settings])
}
