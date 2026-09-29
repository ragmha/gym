import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { summarizeMorningWeights } from '@/lib/dailyGoals'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

interface WeightCardProps {
  snapshot: DailyHealthSnapshot | null
  date: Date
}

export function WeightCard({ snapshot, date }: WeightCardProps) {
  const theme = useTheme()
  const router = useRouter()
  const summary = summarizeMorningWeights(
    snapshot?.bodyMassHistory ?? null,
    date,
  )
  const change =
    summary.currentAverageKg !== null && summary.previousAverageKg !== null
      ? Math.round(
          (summary.currentAverageKg - summary.previousAverageKg) * 10,
        ) / 10
      : null
  const captionStyle = [Typography.bodySm, { color: theme.subtitleText }]

  return (
    <View style={[styles.card, { borderColor: theme.separator }]}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.text }]}
        >
          Morning weight
        </Text>
        <Pressable
          testID="add-weight"
          accessibilityRole="button"
          accessibilityLabel="Add weight"
          accessibilityHint="Enter a measured weight and time to save directly to Apple Health"
          onPress={() =>
            router.push({
              pathname: '/add-weight',
              params: { date: localDateKey(date) },
            })
          }
          style={({ pressed }) => [
            styles.add,
            {
              backgroundColor: theme.accentInactive,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Ionicons name="add" size={18} color={theme.accent} />
          <Text style={[Typography.labelLg, { color: theme.accent }]}>
            Add weight
          </Text>
        </Pressable>
      </View>
      <Text
        selectable
        accessibilityLabel={
          summary.morning
            ? `Morning weight ${summary.morning.kilograms.toFixed(1)} kilograms`
            : 'Morning weight unavailable'
        }
        style={[Typography.numericLg, { color: theme.text }]}
      >
        {summary.morning?.kilograms.toFixed(1) ?? '--'} kg
      </Text>
      <Text style={captionStyle}>
        {summary.morning
          ? `First reading at ${new Date(summary.morning.startISO).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
          : 'No morning weigh-in available for this day'}
      </Text>
      <View style={styles.trend}>
        <Text selectable style={[Typography.labelLg, { color: theme.text }]}>
          7-day average: {summary.currentAverageKg?.toFixed(1) ?? '--'} kg
        </Text>
        <Text selectable style={[Typography.bodyMd, { color: theme.text }]}>
          {change === null
            ? 'Weekly change unavailable'
            : `${change > 0 ? '+' : ''}${change.toFixed(1)} kg vs previous 7 days`}
        </Text>
        <Text style={captionStyle}>
          {summary.currentDays}/7 mornings / previous {summary.previousDays}/7
        </Text>
      </View>
      <Text style={captionStyle}>First reading before noon, once per day.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  title: { ...Typography.headingMd, flexGrow: 1, flexShrink: 1 },
  add: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  trend: {
    paddingVertical: Spacing.md,
    gap: Spacing.xs,
  },
})
