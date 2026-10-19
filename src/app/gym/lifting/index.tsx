import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useMemo } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { ProgrammeOverview } from '@/components/gym/ProgrammeOverview'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useTheme } from '@/hooks/useThemeColor'
import {
  findProgrammeDay,
  PROGRAMME,
  programmeDayFor,
  programmeWorkoutDates,
} from '@/lib/gymProgramme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { useGymLogStore } from '@/stores/GymLogStore'

export default function LiftingScreen() {
  return (
    <HealthDateRoute>
      {(date) => <ProgrammeForDate date={date} />}
    </HealthDateRoute>
  )
}

function ProgrammeForDate({ date }: { date: Date }) {
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const router = useRouter()
  const dateKey = localDateKey(date)
  const programmeStart = useGymLogStore((s) => s.programmeStart)
  const logs = useGymLogStore((s) => s.logs)
  const startProgramme = useGymLogStore((s) => s.startProgramme)
  const log = logs[dateKey]
  const scheduled =
    !log && programmeStart ? programmeDayFor(programmeStart, dateKey) : null
  const day = log
    ? findProgrammeDay(log.day)
    : scheduled && 'day' in scheduled
      ? scheduled.day
      : null
  const selectedDay = day?.day
  const workoutDates = useMemo(() => {
    const dates = programmeWorkoutDates(programmeStart, logs)
    // Keep the selected date available when repeating a previously logged day.
    if (selectedDay) dates.set(selectedDay, dateKey)
    return dates
  }, [programmeStart, logs, selectedDay, dateKey])
  const dateLabel = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const confirmStart = () => {
    const begin = () => startProgramme(dateKey)
    if (!programmeStart) return begin()
    Alert.alert(
      'Restart programme?',
      `${dateLabel} becomes day 1. Saved workouts keep their logged days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', style: 'destructive', onPress: begin },
      ],
    )
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScreenHeader title="Programme overview" subtitle={dateLabel} />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.intro}>
          <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
            {Math.ceil(PROGRAMME.length / 7)} weeks · {PROGRAMME.length} days
          </Text>
          <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
            {programmeStart
              ? 'Choose a day to open its workout.'
              : 'Start the programme to open a workout.'}
          </Text>
        </View>
        {!programmeStart && (
          <Pressable
            testID="gym-start-programme"
            accessibilityRole="button"
            onPress={confirmStart}
            style={[styles.start, { backgroundColor: theme.accent }]}
          >
            <Text style={[Typography.labelLg, { color: theme.selectedText }]}>
              Start day 1 on {dateLabel}
            </Text>
          </Pressable>
        )}
        <ProgrammeOverview
          selectedDay={selectedDay}
          workoutDates={workoutDates}
          availableThrough={dateKey}
          onSelectWorkout={(workoutDate) =>
            router.push({
              pathname: '/gym/lifting/workout',
              params: { date: workoutDate },
            })
          }
        />
        {programmeStart && !log && (
          <Pressable
            accessibilityRole="button"
            onPress={confirmStart}
            style={styles.restart}
          >
            <Text style={[Typography.labelMd, { color: theme.subtitleText }]}>
              Restart programme on this day
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingBottom: Spacing.xxl,
    gap: Spacing.xl,
  },
  intro: { gap: Spacing.xxs },
  start: {
    minHeight: Layout.controlSize,
    padding: Spacing.sm,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restart: {
    minHeight: Layout.controlSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
