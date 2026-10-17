import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { GoalTileSurface } from '@/components/dashboard/GoalGrid'
import type { GoalMascotKind } from '@/components/dashboard/GoalMascot'
import {
  cardioSummary,
  liftingSummary,
  stairmasterSummary,
  weightSummary,
  type ActivitySummary,
  type GymActivity,
} from '@/components/gym/activities'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { Layout, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { findProgrammeDay, programmeDayFor } from '@/lib/gymProgramme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { useGymLogStore } from '@/stores/GymLogStore'

const MAX_TILE = 168

export default function GymScreen() {
  return <HealthDateRoute>{(date) => <GymHub date={date} />}</HealthDateRoute>
}

function GymHub({ date }: { date: Date }) {
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const router = useRouter()
  const dateKey = localDateKey(date)
  const { snapshot, isDemoMode } = useHealthSnapshot(date)
  const programmeStart = useGymLogStore((s) => s.programmeStart)
  const log = useGymLogStore((s) => s.logs[dateKey])
  const [width, setWidth] = useState(0)

  const scheduled =
    !log && programmeStart ? programmeDayFor(programmeStart, dateKey) : null
  const day = log
    ? findProgrammeDay(log.day)
    : scheduled && 'day' in scheduled
      ? scheduled.day
      : null

  const tiles: {
    id: GymActivity
    label: string
    icon: GoalMascotKind
    summary: ActivitySummary
  }[] = [
    {
      id: 'stairmaster',
      label: 'Stairmaster',
      icon: 'stairs',
      summary: stairmasterSummary(snapshot),
    },
    {
      id: 'cardio',
      label: 'Cardio',
      icon: 'cardio',
      summary: cardioSummary(snapshot),
    },
    {
      id: 'lifting',
      label: 'Lifting',
      icon: 'lift',
      summary: liftingSummary(day, log, snapshot),
    },
    {
      id: 'weight',
      label: 'Weight',
      icon: 'weight',
      summary: weightSummary(snapshot, date),
    },
  ]
  const tileSize = Math.max(0, Math.min(width / 2 - Spacing.md, MAX_TILE))

  return (
    <SafeAreaView
      testID="gym-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScreenHeader
        title="Gym"
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
        {isDemoMode && (
          <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
            Demo data - Apple Health is available on iOS.
          </Text>
        )}
        <View
          style={styles.grid}
          onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
        >
          {tiles.map((tile) => (
            <Pressable
              key={tile.id}
              testID={`gym-tile-${tile.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${tile.label}, ${tile.summary.caption === '--' ? 'no data' : tile.summary.caption}`}
              accessibilityHint={`Opens ${tile.label.toLowerCase()} details.`}
              onPress={() =>
                router.push({
                  pathname: `/gym/${tile.id}`,
                  params: { date: dateKey },
                })
              }
              style={({ pressed }) => [
                styles.cell,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <GoalTileSurface
                id={`gym-${tile.id}`}
                icon={tile.icon}
                size={tileSize}
                progress={tile.summary.progress}
                done={tile.summary.done}
              />
              <Text
                numberOfLines={1}
                style={[styles.label, { color: theme.text }]}
              >
                {tile.label}
              </Text>
              <Text
                numberOfLines={1}
                style={[
                  styles.caption,
                  {
                    color:
                      tile.summary.progress !== null &&
                      tile.summary.progress > 0
                        ? theme.goalProgressText
                        : theme.subtitleText,
                  },
                ]}
              >
                {tile.summary.caption}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.lg },
  cell: { width: '50%', alignItems: 'center', gap: Spacing.xxs },
  label: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: Spacing.xs,
  },
  caption: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
})
