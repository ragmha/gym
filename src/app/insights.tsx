import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { CalendarStrip } from '@/components/dashboard/CalendarStrip'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'

export default function InsightsScreen() {
  return (
    <HealthDateRoute>
      {(date) => <InsightsCalendar key={localDateKey(date)} date={date} />}
    </HealthDateRoute>
  )
}

function InsightsCalendar({ date }: { date: Date }) {
  const router = useRouter()
  const theme = useTheme()
  const [focusDate, setFocusDate] = useState(date)
  const openDay = (day: Date) =>
    router.dismissTo({
      pathname: '/',
      params: { date: localDateKey(day) },
    })

  return (
    <SafeAreaView
      testID="insights-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
    >
      <ScreenHeader
        title="Insights"
        backLabel="Back to dashboard"
        onBack={() => openDay(date)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.intro, { color: theme.subtitleText }]}>
          Choose a day to open its dashboard.
        </Text>
        <ScrollView horizontal contentContainerStyle={styles.calendar}>
          <CalendarStrip
            focusDate={focusDate}
            selectedDate={date}
            onFocusDateChange={setFocusDate}
            onDateSelected={openDay}
          />
        </ScrollView>
        <Pressable
          onPress={() => openDay(new Date())}
          style={({ pressed }) => [
            styles.todayButton,
            {
              backgroundColor: theme.accentInactive,
              opacity: pressed ? 0.65 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="View today"
        >
          <Text style={[Typography.labelLg, { color: theme.homeAccent }]}>
            View today
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  intro: {
    ...Typography.bodyMd,
    marginHorizontal: Layout.gutter,
  },
  calendar: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  todayButton: {
    marginHorizontal: Layout.gutter,
    minHeight: Layout.controlSize,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radii.pill,
  },
})
