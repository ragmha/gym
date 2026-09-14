import { Link, useLocalSearchParams } from 'expo-router'
import { useMemo, type ReactNode } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

import { Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'

export function HealthDateRoute({
  children,
}: {
  children: (date: Date) => ReactNode
}) {
  const { date: dateParam } = useLocalSearchParams<{
    date?: string | string[]
  }>()
  const theme = useTheme()
  const date = useMemo(() => {
    if (dateParam === undefined) return new Date()
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
  }, [dateParam])

  if (date === null) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.error}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text
          selectable
          accessibilityRole="alert"
          style={[Typography.bodyMd, { color: theme.text }]}
        >
          Invalid date. Choose a day from Home.
        </Text>
        <Link href="/" asChild>
          <Pressable accessibilityRole="button" style={styles.button}>
            <Text style={[Typography.labelLg, { color: theme.homeAccent }]}>
              Back to home
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
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
})
