import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Elevation, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import type { CoachInsight } from '@/lib/validators'

interface CoachInsightCardProps {
  insight: CoachInsight | null
  status: 'idle' | 'loading' | 'ready' | 'error'
}

const toneColorToken: Record<
  CoachInsight['tone'],
  'success' | 'accent' | 'warning'
> = {
  celebrate: 'success',
  steady: 'accent',
  caution: 'warning',
}

export function CoachInsightCard({ insight, status }: CoachInsightCardProps) {
  const theme = useTheme()

  if (status === 'loading') {
    return (
      <View
        accessibilityLabel="AI Coach insight loading. On-device."
        style={[
          styles.card,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          },
        ]}
        testID="coach-insight-card-loading"
      >
        <Header accentColor={theme.accent} />
        <View style={styles.skeletonStack}>
          <View
            style={[
              styles.skeletonLine,
              styles.skeletonHeadline,
              { backgroundColor: theme.skeletonElement },
            ]}
          />
          <View
            style={[
              styles.skeletonLine,
              { backgroundColor: theme.skeletonElement },
            ]}
          />
          <View
            style={[
              styles.skeletonLine,
              styles.skeletonShort,
              { backgroundColor: theme.skeletonElement },
            ]}
          />
        </View>
      </View>
    )
  }

  if (status === 'error' || !insight) {
    return null
  }

  const accentColor = theme[toneColorToken[insight.tone]]

  return (
    <View
      accessibilityLabel={`AI Coach insight. On-device. ${insight.headline}. ${insight.body} Suggestion: ${insight.suggestion}`}
      style={[
        styles.card,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.border,
        },
      ]}
      testID="coach-insight-card"
    >
      <Header accentColor={accentColor} />
      <Text selectable style={[styles.headline, { color: theme.text }]}>
        {insight.headline}
      </Text>
      <Text selectable style={[styles.body, { color: theme.subtitleText }]}>
        {insight.body}
      </Text>
      <View style={styles.suggestionRow}>
        <Ionicons name="bulb" size={15} color={accentColor} />
        <Text selectable style={[styles.suggestion, { color: theme.text }]}>
          {insight.suggestion}
        </Text>
      </View>
    </View>
  )
}

function Header({ accentColor }: { accentColor: string }) {
  const theme = useTheme()

  return (
    <View style={styles.headerRow}>
      <View style={styles.labelRow}>
        <View
          style={[styles.iconBadge, { backgroundColor: theme.cardSurface }]}
        >
          <Ionicons name="sparkles" size={14} color={accentColor} />
        </View>
        <Text style={[styles.label, { color: theme.text }]}>AI Coach</Text>
      </View>
      <View style={[styles.pill, { backgroundColor: theme.badgeBackground }]}>
        <Text style={[styles.pillText, { color: theme.subtitleText }]}>
          On-device
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    ...Elevation.soft,
    width: '100%',
    borderRadius: Radii.panel,
    borderCurve: 'continuous',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...Typography.headingSm,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: {
    ...Typography.labelMd,
  },
  headline: {
    ...Typography.headingMd,
  },
  body: {
    ...Typography.bodyMd,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 2,
  },
  suggestion: {
    flex: 1,
    ...Typography.bodyMd,
  },
  skeletonStack: {
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    width: '100%',
    borderRadius: 999,
  },
  skeletonHeadline: {
    height: 18,
    width: '62%',
  },
  skeletonShort: {
    width: '76%',
  },
})
