import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { presentSteps } from '@/lib/fitnessMetrics/presenter'
import type { DailyHealthSnapshot } from '@/lib/healthSnapshot/types'

export function StepsOverview({
  snapshot,
  onPress,
}: {
  snapshot: DailyHealthSnapshot | null
  onPress: () => void
}) {
  const theme = useTheme()
  const steps = presentSteps(snapshot)

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.homeSurface, opacity: pressed ? 0.6 : 1 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={
        steps.status === 'empty' ? 'Steps unavailable' : `Steps ${steps.value}`
      }
      accessibilityHint="Opens step details for the selected day"
    >
      <View style={styles.heading}>
        <Ionicons name="footsteps-outline" size={24} color={theme.homeAccent} />
        <Text style={[styles.label, { color: theme.text }]}>Steps</Text>
        <Ionicons name="chevron-forward" size={20} color={theme.subtitleText} />
      </View>
      <Text
        selectable
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.value, { color: theme.text }]}
      >
        {steps.value}
      </Text>
      <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
        {steps.status === 'empty' ? 'No reading for this day' : 'Daily total'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    borderCurve: 'continuous',
    gap: Spacing.sm,
  },
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  label: {
    ...Typography.headingSm,
    flex: 1,
  },
  value: {
    ...Typography.displayLg,
    fontVariant: ['tabular-nums'],
  },
})
