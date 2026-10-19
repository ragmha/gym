import { Link, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppState, Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { Ionicons } from '@expo/vector-icons'

export function HealthDateRoute({
  children,
}: {
  children: (date: Date) => ReactNode
}) {
  const { date: dateParam } = useLocalSearchParams<{
    date?: string | string[]
  }>()
  const theme = useTheme()
  const [today, setToday] = useState(() => new Date())
  useEffect(() => {
    if (dateParam !== undefined) return

    const updateToday = () => {
      const now = new Date()
      setToday((current) =>
        localDateKey(current) === localDateKey(now) ? current : now,
      )
    }
    let rolloverTimer: ReturnType<typeof setTimeout> | undefined
    const scheduleRollover = () => {
      const now = new Date()
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      )
      rolloverTimer = setTimeout(
        () => {
          updateToday()
          scheduleRollover()
        },
        Math.max(1, nextMidnight.getTime() - now.getTime() + 1),
      )
    }
    const foreground = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return
      clearTimeout(rolloverTimer)
      updateToday()
      scheduleRollover()
    })

    updateToday()
    scheduleRollover()
    return () => {
      clearTimeout(rolloverTimer)
      foreground.remove()
    }
  }, [dateParam])

  const date = useMemo(() => {
    if (dateParam === undefined) return today
    if (
      typeof dateParam !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ) {
      return null
    }
    // Date-only ISO parsing uses UTC; local noon keeps the chosen calendar day.
    const parsed = new Date(`${dateParam}T12:00:00`)
    return Number.isFinite(parsed.getTime()) &&
      localDateKey(parsed) === dateParam
      ? parsed
      : null
  }, [dateParam, today])

  if (date === null) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.error}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.icon, { backgroundColor: theme.cardSurface }]}>
          <Ionicons name="calendar-outline" size={32} color={theme.icon} />
        </View>
        <Text
          selectable
          accessibilityRole="alert"
          style={[Typography.bodyMd, { color: theme.text }]}
        >
          Invalid date. Choose a day in Insights.
        </Text>
        <Link href="/insights" asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[Typography.labelLg, { color: theme.selectedText }]}>
              Open Insights
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    )
  }

  return children(date)
}

const styles = StyleSheet.create({
  error: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    padding: Layout.gutter,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: Layout.controlSize,
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radii.pill,
  },
})
