import { useRouter } from 'expo-router'
import { Pressable, StyleSheet } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { ActivityDetail } from '@/components/gym/ActivityDetail'
import { weightSummary } from '@/components/gym/activities'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { Radii, Spacing } from '@/constants/DesignSystem'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { summarizeMorningWeights } from '@/lib/dailyGoals'
import { localDateKey, localDaysEnding } from '@/lib/healthSnapshot/dateKey'

export default function WeightScreen() {
  return (
    <HealthDateRoute>{(date) => <WeightForDate date={date} />}</HealthDateRoute>
  )
}

function WeightForDate({ date }: { date: Date }) {
  const theme = useTheme()
  const router = useRouter()
  const { snapshot } = useHealthSnapshot(date)
  const samples = snapshot?.bodyMassHistory ?? null
  const week = summarizeMorningWeights(samples, date)
  const change =
    week.currentAverageKg !== null && week.previousAverageKg !== null
      ? week.currentAverageKg - week.previousAverageKg
      : null
  const params = { date: localDateKey(date) }
  return (
    <ActivityDetail
      testID="gym-weight-screen"
      title="Weight"
      date={date}
      icon="weight"
      summary={weightSummary(snapshot, date)}
      detail="Morning weigh-in · Apple Health"
      stats={[
        {
          label: '7-day avg',
          value:
            week.currentAverageKg === null
              ? '--'
              : `${week.currentAverageKg.toFixed(1)}`,
        },
        {
          label: 'vs last week',
          value:
            change === null
              ? '--'
              : `${change > 0 ? '+' : ''}${change.toFixed(1)}`,
        },
      ]}
      recent={
        samples === null
          ? null
          : localDaysEnding(date, 7).map((day) => ({
              date: day,
              done: summarizeMorningWeights(samples, day).morning !== null,
            }))
      }
    >
      <Pressable
        testID="gym-add-weight"
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/add-weight', params })}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.goalComplete, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.label, { color: theme.goalOnComplete }]}>
          Add weight
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/fitness-metrics', params })}
        hitSlop={8}
      >
        <Text style={[styles.label, { color: theme.subtitleText }]}>
          All weigh-ins
        </Text>
      </Pressable>
    </ActivityDetail>
  )
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  label: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
})
