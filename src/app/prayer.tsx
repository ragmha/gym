import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useTheme } from '@/hooks/useThemeColor'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import {
  PRAYER_LABELS,
  PRAYERS,
  prayerStreak,
  prayerTimes,
  type Prayer,
} from '@/lib/prayer'
import { usePrayerLogStore } from '@/stores/PrayerLogStore'

const NO_PRAYERS: readonly Prayer[] = []

export default function PrayerScreen() {
  return (
    <HealthDateRoute>{(date) => <PrayerForDate date={date} />}</HealthDateRoute>
  )
}

function formatTime(time: Date | null) {
  if (time === null) return '--'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(time.getHours())}:${pad(time.getMinutes())}`
}

function PrayerForDate({ date }: { date: Date }) {
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const key = localDateKey(date)
  const prayed = usePrayerLogStore((state) => state.prayed)
  const toggle = usePrayerLogStore((state) => state.toggle)
  const marked = prayed[key] ?? NO_PRAYERS
  const times = prayerTimes(date)
  const streak = prayerStreak(prayed, date)
  const future = key > localDateKey(new Date())

  return (
    <SafeAreaView
      testID="prayer-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScreenHeader
        title="Prayer"
        subtitle={date.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.summary}>
          <Text style={[styles.count, { color: theme.text }]}>
            {`${marked.length}/${PRAYERS.length}`}
          </Text>
          <Text style={[Typography.bodyLg, { color: theme.subtitleText }]}>
            prayers marked
          </Text>
          <Text style={[Typography.labelLg, { color: theme.subtitleText }]}>
            {streak === 1 ? '1 day streak' : `${streak} day streak`}
          </Text>
        </View>
        <View style={[styles.list, { backgroundColor: theme.homeSurface }]}>
          {PRAYERS.map((prayer, index) => {
            const checked = marked.includes(prayer)
            const label = PRAYER_LABELS[prayer]
            const time = formatTime(times[prayer])
            return (
              <Pressable
                key={prayer}
                testID={`prayer-${prayer}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled: future }}
                aria-checked={checked}
                aria-disabled={future}
                accessibilityLabel={`${label.en}, ${time}`}
                disabled={future}
                onPress={() => toggle(key, prayer)}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && {
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: theme.separator,
                  },
                  { opacity: future ? 0.5 : pressed ? 0.7 : 1 },
                ]}
              >
                <View style={styles.name}>
                  <Text style={[Typography.labelLg, { color: theme.text }]}>
                    {label.en}
                  </Text>
                  <Text
                    style={[
                      Typography.bodySm,
                      { color: theme.subtitleText, textAlign: 'left' },
                    ]}
                  >
                    {label.ar}
                  </Text>
                </View>
                <Text style={[styles.time, { color: theme.text }]}>{time}</Text>
                <Ionicons
                  name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                  size={28}
                  color={checked ? theme.accent : theme.subtitleText}
                />
              </Pressable>
            )
          })}
        </View>
        <Text style={[styles.note, { color: theme.subtitleText }]}>
          Times are calculated on this device for Helsinki with the Muslim World
          League method and Shafi Asr. At this latitude Fajr and Isha use the
          middle-of-the-night rule, so they are estimates around midsummer. Your
          checklist stays on this device.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  summary: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    gap: Spacing.xxs,
  },
  count: { ...Typography.displayLg, fontVariant: ['tabular-nums'] },
  list: {
    marginHorizontal: Layout.gutter,
    borderRadius: Radii.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  name: { flex: 1, gap: 2 },
  time: { ...Typography.numericMd, fontVariant: ['tabular-nums'] },
  note: { ...Typography.bodySm, marginHorizontal: Layout.gutter },
})
