import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ActivityHeatmap } from '@/components/charts/ActivityHeatmap'
import { CalendarStrip } from '@/components/dashboard/CalendarStrip'
import { DailyActivityRows } from '@/components/dashboard/DailyActivityRows'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { RecoveryOverview } from '@/components/dashboard/RecoveryOverview'
import { WeightCard } from '@/components/dashboard/WeightCard'
import { Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export default function HomeScreen() {
  const router = useRouter()
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const insets = useSafeAreaInsets()

  const [focusDate, setFocusDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [refreshing, setRefreshing] = useState(false)
  const [calendarExpanded, setCalendarExpanded] = useState(false)
  const [detailsExpanded, setDetailsExpanded] = useState(false)

  const handleDateSelected = useCallback((date: Date) => {
    setSelectedDate(date)
    setFocusDate(date)
    setCalendarExpanded(false)
  }, [])

  const { snapshot, status, error, isDemoMode, refresh } =
    useHealthSnapshot(selectedDate)
  const hasFocused = useRef(false)

  useFocusEffect(
    useCallback(() => {
      // The snapshot hook already loads the selected day on mount.
      if (hasFocused.current) {
        void refresh()
      }
      hasFocused.current = true
    }, [refresh]),
  )

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refresh()
    } finally {
      setRefreshing(false)
    }
  }, [refresh])

  const shiftWeek = useCallback(
    (weeks: number) => {
      const next = new Date(focusDate)
      next.setDate(next.getDate() + weeks * 7)
      if (weeks > 0 && next > new Date()) return
      setFocusDate(next)
      setSelectedDate(next)
    },
    [focusDate],
  )

  const dateLabel = useMemo(() => {
    if (isSameDay(selectedDate, new Date())) return 'TODAY'
    return selectedDate
      .toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      .toUpperCase()
  }, [selectedDate])

  const nextWeek = new Date(focusDate)
  nextWeek.setDate(nextWeek.getDate() + 7)
  const canGoForward = nextWeek <= new Date()

  return (
    <ScrollView
      testID="home-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      contentContainerStyle={[
        styles.content,
        Platform.OS !== 'ios' && {
          paddingTop: insets.top + Spacing.xs,
          paddingBottom: insets.bottom + Spacing.xxl,
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          testID="home-refresh"
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.homeAccent}
        />
      }
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <DashboardHeader
        dateLabel={dateLabel}
        calendarExpanded={calendarExpanded}
        onDatePress={() => setCalendarExpanded((expanded) => !expanded)}
        onCoachPress={() => router.push('/coach')}
        onSettingsPress={() => router.push('/settings')}
      />

      {calendarExpanded && (
        <View>
          <View style={styles.weekNavigation}>
            <Pressable
              onPress={() => shiftWeek(-1)}
              style={styles.weekButton}
              accessibilityRole="button"
              accessibilityLabel="Previous week"
            >
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </Pressable>
            <Text style={[styles.month, { color: theme.text }]}>
              {focusDate.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <Pressable
              onPress={() => shiftWeek(1)}
              disabled={!canGoForward}
              style={styles.weekButton}
              accessibilityRole="button"
              accessibilityLabel="Next week"
              accessibilityState={{ disabled: !canGoForward }}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={canGoForward ? theme.text : theme.disabled}
              />
            </Pressable>
          </View>
          <CalendarStrip
            focusDate={focusDate}
            selectedDate={selectedDate}
            onFocusDateChange={setFocusDate}
            onDateSelected={handleDateSelected}
            compact
          />
        </View>
      )}

      {isDemoMode && (
        <Text style={[styles.demo, { color: theme.subtitleText }]}>
          Demo data - Apple Health is available on iOS.
        </Text>
      )}

      {status === 'loading' && !snapshot ? (
        <View style={styles.loadState}>
          <ActivityIndicator color={theme.homeAccent} />
          <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
            Loading health data...
          </Text>
        </View>
      ) : status === 'error' ? (
        <View style={styles.loadState}>
          <Text
            selectable
            accessibilityRole="alert"
            style={[styles.error, { color: theme.text }]}
          >
            {error ?? 'Unable to load health data'}
          </Text>
          <Pressable
            onPress={onRefresh}
            style={styles.weekButton}
            accessibilityRole="button"
            accessibilityLabel="Retry loading health data"
          >
            <Text style={[Typography.labelLg, { color: theme.homeAccent }]}>
              Try again
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <RecoveryOverview snapshot={snapshot} />
          <DailyActivityRows snapshot={snapshot} />
          <View>
            <Pressable
              onPress={() => setDetailsExpanded((expanded) => !expanded)}
              style={({ pressed }) => [
                styles.detailsButton,
                { borderColor: theme.separator, opacity: pressed ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ expanded: detailsExpanded }}
              aria-expanded={detailsExpanded}
              accessibilityLabel="More health data"
            >
              <Text style={[styles.linkLabel, { color: theme.text }]}>
                More health data
              </Text>
              <Ionicons
                name={detailsExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.subtitleText}
              />
            </Pressable>
            {detailsExpanded && (
              <>
                <WeightCard bodyMassKg={snapshot?.bodyMassKg ?? null} />
                <ActivityHeatmap title="Recent activity" />
              </>
            )}
          </View>
        </>
      )}

      <Pressable
        onPress={() => router.push('/fitness-metrics')}
        style={({ pressed }) => [
          styles.metricsLink,
          { opacity: pressed ? 0.6 : 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel="See all metrics"
      >
        <Text style={[styles.linkLabel, { color: theme.homeAccent }]}>
          See all metrics
        </Text>
        <Ionicons name="chevron-forward" size={20} color={theme.homeAccent} />
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxl,
    gap: Spacing.lg,
  },
  weekNavigation: {
    marginHorizontal: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekButton: {
    minWidth: 44,
    minHeight: 44,
    padding: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  month: {
    ...Typography.labelLg,
    flexShrink: 1,
    textAlign: 'center',
  },
  demo: {
    ...Typography.bodySm,
    marginHorizontal: Spacing.lg,
    textAlign: 'center',
  },
  loadState: {
    minHeight: 240,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  error: {
    ...Typography.bodyMd,
    textAlign: 'center',
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    minHeight: 48,
  },
  metricsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    marginHorizontal: Spacing.lg,
  },
  linkLabel: {
    ...Typography.labelLg,
    flex: 1,
  },
})
