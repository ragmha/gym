import { renderHook } from '@testing-library/react-native'

import { usePrayerReminders } from '@/hooks/usePrayerReminders'
import { DEFAULT_PRAYER_SETTINGS } from '@/lib/prayer'
import { syncPrayerReminders } from '@/lib/prayerReminders'
import { useThemeStore } from '@/stores/ThemeStore'

jest.mock('@/lib/prayerLocation', () => ({
  prayerNativeSupport: jest.fn(() => ({ available: true })),
}))
jest.mock('@/lib/prayerReminders', () => ({
  syncPrayerReminders: jest.fn(() => Promise.resolve('off')),
}))
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
}))

describe('usePrayerReminders', () => {
  it('syncs while reminders are off so stale reminders are cancelled', () => {
    useThemeStore.setState({
      prayer: { ...DEFAULT_PRAYER_SETTINGS, reminders: false },
    })
    renderHook(() => usePrayerReminders())

    expect(syncPrayerReminders).toHaveBeenCalledWith(
      expect.objectContaining({ reminders: false }),
    )
  })
})
