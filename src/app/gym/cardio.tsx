import { StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { ActivityDetail, streakStats } from '@/components/gym/ActivityDetail'
import { cardioSummary } from '@/components/gym/activities'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'
import { CARDIO_MINUTES_GOAL } from '@/lib/dailyGoals'
import { findProgrammeDay, programmeDayFor } from '@/lib/gymProgramme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type { HealthWorkout } from '@/lib/healthSnapshot/types'
import { useGymLogStore } from '@/stores/GymLogStore'

export default function CardioScreen() {
  return (
    <HealthDateRoute>{(date) => <CardioForDate date={date} />}</HealthDateRoute>
  )
}

function CardioForDate({ date }: { date: Date }) {
  const dateKey = localDateKey(date)
  const { snapshot, status, error, isDemoMode } = useHealthSnapshot(date)
  const programmeStart = useGymLogStore((s) => s.programmeStart)
  const loggedDay = useGymLogStore((s) => s.logs[dateKey]?.day)
  const scheduled = programmeStart
    ? programmeDayFor(programmeStart, dateKey)
    : null
  const day = loggedDay
    ? findProgrammeDay(loggedDay)
    : scheduled && 'day' in scheduled
      ? scheduled.day
      : null
  const history = useWorkoutHistory(date, 31, snapshot)?.map((d) => ({
    date: new Date(`${d.date}T12:00:00`),
    done: cardioSummary(d).done,
  }))
  const runs = (snapshot?.workouts ?? [])
    .filter((workout) => workout.kind === 'running')
    .sort((a, b) => Date.parse(b.startISO) - Date.parse(a.startISO))
  return (
    <ActivityDetail
      testID="gym-cardio-screen"
      title="Cardio"
      date={date}
      icon="cardio"
      summary={
        status === 'error' || !snapshot
          ? {
              progress: null,
              done: false,
              caption: '--',
              headline:
                status === 'error'
                  ? 'Health data unavailable'
                  : 'Loading workouts',
            }
          : cardioSummary(snapshot)
      }
      detail={
        day && 'cardio' in day
          ? `Plan ${day.cardio.morning} AM · ${day.cardio.evening} PM`
          : `Goal ${CARDIO_MINUTES_GOAL} min run · ${isDemoMode ? 'Sample data' : 'Apple Health'}`
      }
      stats={streakStats(history ?? null)}
      recent={history?.slice(-7) ?? null}
      beforeSummary={
        <CardioSessions
          runs={runs}
          status={status}
          error={error}
          isDemoMode={isDemoMode}
        />
      }
    />
  )
}

function CardioSessions({
  runs,
  status,
  error,
  isDemoMode,
}: {
  runs: HealthWorkout[]
  status: 'loading' | 'ready' | 'error'
  error: string | null
  isDemoMode: boolean
}) {
  const theme = useTheme()
  const source = isDemoMode ? 'Sample workouts' : 'Apple Health workouts'

  return (
    <View testID="cardio-workouts" style={styles.section}>
      <Text style={[Typography.labelMd, { color: theme.subtitleText }]}>
        {source}
      </Text>
      {status === 'error' ? (
        <Text style={{ color: theme.subtitleText }}>
          {error ?? 'Unable to load health data.'}
        </Text>
      ) : status === 'loading' && runs.length === 0 ? (
        <Text style={{ color: theme.subtitleText }}>
          Loading Apple Health workouts…
        </Text>
      ) : runs.length === 0 ? (
        <Text style={{ color: theme.subtitleText }}>
          No recorded runs for this day.
        </Text>
      ) : (
        runs.map((workout, index) => {
          const duration = elapsedTime(workout.durationMinutes)
          const distance =
            workout.distance === null ? null : workout.distance.toFixed(2)
          const calories =
            workout.calories === null
              ? null
              : String(Math.round(workout.calories))
          const time = new Date(workout.startISO).toLocaleTimeString(
            undefined,
            {
              hour: 'numeric',
              minute: '2-digit',
            },
          )
          const metrics = [
            {
              label: 'Kilometers',
              value: distance ?? '--',
              accessibilityLabel: `Distance: ${distance === null ? '--' : `${distance} km`}`,
            },
            {
              label: 'Time',
              value: duration,
              accessibilityLabel: `Time: ${duration}`,
            },
            {
              label: 'Calories',
              value: calories ?? '--',
              accessibilityLabel: `Calories: ${calories === null ? '--' : `${calories} kcal`}`,
            },
          ]

          return (
            <View
              key={`${workout.startISO}-${index}`}
              testID="cardio-session"
              style={[
                styles.session,
                {
                  backgroundColor: theme.homeSurface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={[Typography.headingSm, { color: theme.text }]}>
                {workout.activityName} · {time}
              </Text>
              <View style={styles.metrics}>
                {metrics.map((metric) => (
                  <View
                    key={metric.label}
                    accessible
                    accessibilityLabel={metric.accessibilityLabel}
                    style={styles.metric}
                  >
                    <Text
                      style={[
                        Typography.numericMd,
                        styles.center,
                        { color: theme.text },
                      ]}
                    >
                      {metric.value}
                    </Text>
                    <Text
                      style={[
                        Typography.labelSm,
                        styles.center,
                        { color: theme.subtitleText },
                      ]}
                    >
                      {metric.label}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.duration}>
                <Text
                  accessibilityLabel={`Workout time: ${duration}`}
                  style={[Typography.displayLg, { color: theme.text }]}
                >
                  {duration}
                </Text>
                <Text
                  style={[Typography.labelMd, { color: theme.subtitleText }]}
                >
                  Time
                </Text>
              </View>
            </View>
          )
        })
      )}
    </View>
  )
}

function elapsedTime(durationMinutes: number): string {
  const totalSeconds = Math.round(durationMinutes * 60)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return hours
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`
}

const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
    gap: Spacing.md,
  },
  session: {
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  metrics: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: Spacing.xs,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  center: { textAlign: 'center' },
  duration: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.xxs,
  },
})
