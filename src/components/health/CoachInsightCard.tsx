import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

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
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <Text style={[styles.headline, { color: theme.text }]}>
        {insight.headline}
      </Text>
      <Text style={[styles.body, { color: theme.subtitleText }]}>
        {insight.body}
      </Text>
      <View style={styles.suggestionRow}>
        <Ionicons name="bulb" size={15} color={accentColor} />
        <Text style={[styles.suggestion, { color: theme.text }]}>
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
          style={[styles.iconBadge, { backgroundColor: `${accentColor}1A` }]}
        >
          <Ionicons name="sparkles" size={14} color={accentColor} />
        </View>
        <Text style={[styles.label, { color: theme.subtitleText }]}>
          AI Coach
        </Text>
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
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
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
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  accentBar: {
    height: 3,
    width: 44,
    borderRadius: 999,
  },
  headline: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingTop: 2,
  },
  suggestion: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
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
