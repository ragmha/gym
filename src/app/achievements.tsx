import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { HealthReadState } from '@/components/health/HealthReadState'
import { Layout, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useTheme } from '@/hooks/useThemeColor'
import {
  buildAchievements,
  type AchievementInput,
  type Badge,
} from '@/lib/achievements'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { useGymLogStore } from '@/stores/GymLogStore'

// ponytail: one year of Health history; widen if older records matter.
const DAYS = 365

type History = Omit<AchievementInput, 'gymLogs'>

function formatDay(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function Medal({ badge }: { badge: Badge }) {
  const theme = useTheme()
  const earned = badge.date !== null
  const color = earned ? theme.goalOnComplete : theme.subtitleText
  const detail = earned
    ? [badge.value, formatDay(badge.date!)].filter(Boolean).join(', ')
    : badge.progress
      ? `locked, ${badge.progress.current.toLocaleString()} of ${badge.progress.target.toLocaleString()}`
      : 'locked, no readings yet'

  return (
    <View
      testID={`badge-${badge.id}`}
      style={styles.badge}
      accessible
      accessibilityLabel={`${badge.title}, ${earned ? `earned, ${detail}` : detail}`}
    >
      <View
        style={[
          styles.medal,
          earned
            ? { backgroundColor: theme.goalComplete }
            : { borderColor: theme.goalTrack, borderWidth: 2 },
        ]}
      >
        {badge.mark ? (
          <Text style={[styles.mark, { color }]}>{badge.mark}</Text>
        ) : (
          <Ionicons name={badge.icon} size={30} color={color} />
        )}
      </View>
      <Text
        style={[
          styles.title,
          { color: earned ? theme.text : theme.subtitleText },
        ]}
      >
        {badge.title}
      </Text>
      {!earned && badge.progress && badge.progress.current > 0 && (
        <Text style={[styles.small, { color: theme.subtitleText }]}>
          {badge.progress.current.toLocaleString()}/
          {badge.progress.target.toLocaleString()}
        </Text>
      )}
      {earned && badge.value && (
        <Text style={[styles.small, { color: theme.text }]}>{badge.value}</Text>
      )}
      {earned && (
        <Text style={[styles.small, { color: theme.subtitleText }]}>
          {formatDay(badge.date!)}
        </Text>
      )}
    </View>
  )
}

export default function AchievementsScreen() {
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const gymLogs = useGymLogStore((state) => state.logs)
  const [history, setHistory] = useState<History | null>(null)
  const [failed, setFailed] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const today = new Date()
    try {
      const [steps, water, workouts] = await Promise.all([
        healthSnapshot.getStepHistory(today, DAYS),
        healthSnapshot.getWaterHistory(today, DAYS),
        healthSnapshot.getWorkoutHistory(today, DAYS),
      ])
      setHistory({ steps, water, workouts })
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  const sections = history ? buildAchievements({ ...history, gymLogs }) : []
  const earned = sections
    .flatMap((section) => section.badges)
    .filter((badge) => badge.date !== null).length
  const total = sections.reduce((sum, s) => sum + s.badges.length, 0)

  return (
    <SafeAreaView
      testID="achievements-screen"
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScreenHeader
        title="Achievements"
        subtitle={history ? `${earned} of ${total} earned` : undefined}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
      >
        {failed && !history ? (
          <HealthReadState onRetry={onRefresh} />
        ) : !history ? (
          <HealthReadState loading />
        ) : (
          <>
            {sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text
                  accessibilityRole="header"
                  style={[Typography.headingMd, { color: theme.text }]}
                >
                  {section.title}
                </Text>
                <View style={styles.grid}>
                  {section.badges.map((badge) => (
                    <Medal key={badge.id} badge={badge} />
                  ))}
                </View>
              </View>
            ))}
            <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
              {healthSnapshot.isAvailable()
                ? 'Past year of Apple Health readings'
                : 'Demo data'}{' '}
              plus your on-device lifting log. Pace and distance records are not
              included.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  section: { gap: Spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.lg },
  badge: {
    width: '33.333%',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xxs,
  },
  medal: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxs,
  },
  mark: { ...Typography.labelLg, fontSize: 18 },
  title: { ...Typography.labelMd, textAlign: 'center' },
  small: { ...Typography.bodySm, textAlign: 'center' },
})
