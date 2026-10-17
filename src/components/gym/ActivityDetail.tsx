import { StatusBar } from 'expo-status-bar'
import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { GoalTileSurface } from '@/components/dashboard/GoalGrid'
import type { GoalMascotKind } from '@/components/dashboard/GoalMascot'
import { Layout, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useTheme } from '@/hooks/useThemeColor'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'

import type { ActivitySummary } from './activities'

export interface RecentDay {
  date: Date
  done: boolean
}

/** Days met in a row ending on the last day; an unmet last day only counts as open when it is today. */
export function currentStreak(days: RecentDay[], today = new Date()): number {
  let streak = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].done) streak++
    else if (
      i === days.length - 1 &&
      localDateKey(days[i].date) === localDateKey(today)
    )
      continue
    else break
  }
  return streak
}

/** Streak and week stats from a workout history, or `--` while it is unavailable. */
export function streakStats(
  history: RecentDay[] | null,
): { label: string; value: string }[] {
  if (!history?.length) {
    return [
      { label: 'Streak', value: '--' },
      { label: 'This week', value: '--' },
    ]
  }
  const streak = currentStreak(history)
  const week = history.slice(-7)
  return [
    {
      label: 'Streak',
      value: `${Math.min(streak, 30)}D${streak >= 30 ? '+' : ''}`,
    },
    {
      label: 'This week',
      value: `${week.filter((d) => d.done).length}/${week.length}`,
    },
  ]
}

export function ActivityDetail({
  testID,
  title,
  date,
  icon,
  summary,
  detail,
  stats,
  recent,
  children,
}: {
  testID: string
  title: string
  date: Date
  icon: GoalMascotKind
  summary: ActivitySummary
  detail: string
  stats: { label: string; value: string }[]
  recent: RecentDay[] | null
  children?: ReactNode
}) {
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const { width } = useWindowDimensions()
  const size = Math.min(width * 0.5, 200)
  const mono = [styles.mono, { color: theme.subtitleText }]

  return (
    <SafeAreaView
      testID={testID}
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScreenHeader
        title={title}
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
        <GoalTileSurface
          id={testID}
          icon={icon}
          size={size}
          progress={summary.progress}
          done={summary.done}
        />
        <View style={styles.center}>
          <Text
            accessibilityRole="header"
            style={[
              Typography.headingLg,
              styles.centerText,
              { color: theme.text },
            ]}
          >
            {summary.headline}
          </Text>
          <Text style={[mono, styles.centerText, styles.detail]}>{detail}</Text>
        </View>

        <View style={styles.stats}>
          {stats.map((stat) => (
            <View
              key={stat.label}
              style={styles.stat}
              accessible
              accessibilityLabel={`${stat.label}: ${stat.value}`}
            >
              <Text style={[styles.statValue, { color: theme.text }]}>
                {stat.value}
              </Text>
              <Text style={mono}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {recent && (
          <View
            style={styles.recent}
            accessible
            accessibilityLabel={`Recent days: ${recent
              .map(
                (day) =>
                  `${day.date.toLocaleDateString(undefined, { weekday: 'long' })} ${day.done ? 'met' : 'not met'}`,
              )
              .join(', ')}`}
          >
            <Text style={mono}>Recent days</Text>
            <View style={styles.strip}>
              {recent.map((day, index) => (
                <View key={day.date.toISOString()} style={styles.dayColumn}>
                  <View style={styles.dotRow}>
                    <View
                      style={[
                        styles.line,
                        index > 0 && { backgroundColor: theme.goalTrack },
                      ]}
                    />
                    <View
                      testID={`recent-${index}-${day.done ? 'done' : 'missed'}`}
                      style={[
                        day.done ? styles.dotDone : styles.dot,
                        {
                          backgroundColor: day.done
                            ? theme.text
                            : theme.subtitleText,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.line,
                        index < recent.length - 1 && {
                          backgroundColor: theme.goalTrack,
                        },
                      ]}
                    />
                  </View>
                  <Text style={mono}>
                    {day.date
                      .toLocaleDateString(undefined, { weekday: 'narrow' })
                      .slice(0, 1)}
                  </Text>
                  <View
                    style={[
                      styles.today,
                      index === recent.length - 1 && {
                        backgroundColor: theme.text,
                      },
                    ]}
                  />
                </View>
              ))}
            </View>
          </View>
        )}
        {children}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    alignItems: 'center',
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  center: { alignItems: 'center', gap: Spacing.xxs },
  centerText: { textAlign: 'center' },
  detail: { letterSpacing: 1 },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  stats: { flexDirection: 'row', alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  statValue: {
    fontFamily: 'SpaceMono',
    fontSize: 24,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
  },
  recent: { alignItems: 'center', alignSelf: 'stretch', gap: Spacing.sm },
  strip: { flexDirection: 'row', alignSelf: 'stretch' },
  dayColumn: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  dotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    height: 18,
  },
  line: { flex: 1, height: 1 },
  dot: { width: 5, height: 5, borderRadius: 3, marginHorizontal: 6 },
  dotDone: { width: 17, height: 17, borderRadius: 9 },
  today: { width: 4, height: 4, borderRadius: 2 },
})
