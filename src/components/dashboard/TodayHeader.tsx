import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/hooks/useThemeColor'
import type { TodaySuggestion } from '@/hooks/useTodaySuggestion'
import { PILLAR_META } from '@/lib/training/pillars'

interface TodayHeaderProps {
  date: Date
  /** 0-100 recovery score from useRecovery or null while loading. */
  recoveryScore: number | null
  suggestion: TodaySuggestion
}

function formatDate(date: Date): string {
  return date
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
    .toUpperCase()
}

function recoveryDotColor(score: number | null): string {
  if (score == null) return '#94A3B8'
  if (score >= 67) return '#22C55E'
  if (score >= 34) return '#F59E0B'
  return '#EF4444'
}

export function TodayHeader({
  date,
  recoveryScore,
  suggestion,
}: TodayHeaderProps) {
  const theme = useTheme()
  const meta = suggestion.pillar ? PILLAR_META[suggestion.pillar] : null
  const iconName = meta?.ioniconName ?? 'bed-outline'
  const recoveryColor = recoveryDotColor(recoveryScore)

  return (
    <View style={styles.container}>
      <View style={styles.metaRow}>
        <Text style={[styles.dateLabel, { color: theme.subtitleText }]}>
          {formatDate(date)}
        </Text>
        <View
          style={[
            styles.recoveryChip,
            { backgroundColor: theme.cardBackground },
          ]}
        >
          <View
            style={[styles.recoveryDot, { backgroundColor: recoveryColor }]}
          />
          <Text style={[styles.recoveryText, { color: theme.text }]}>
            {recoveryScore == null ? '--' : `${recoveryScore}%`} ready
          </Text>
        </View>
      </View>

      <Text style={[styles.eyebrow, { color: theme.hero }]}>TODAY</Text>
      <View style={styles.headlineRow}>
        <Text style={[styles.headline, { color: theme.text }]}>
          {suggestion.headline}
        </Text>
        <View
          style={[
            styles.suggestionIconWrap,
            { backgroundColor: theme.heroSoft },
          ]}
        >
          <Ionicons
            name={iconName as React.ComponentProps<typeof Ionicons>['name']}
            size={26}
            color={theme.hero}
          />
        </View>
      </View>
      <Text style={[styles.reason, { color: theme.subtitleText }]}>
        {suggestion.reason}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  recoveryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  recoveryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recoveryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headline: {
    flex: 1,
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  suggestionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reason: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
})
