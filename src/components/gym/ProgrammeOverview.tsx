import { Ionicons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import {
  PROGRAMME,
  savedWorkoutDates,
  type ProgrammeDay,
} from '@/lib/gymProgramme'
import { useGymLogStore } from '@/stores/GymLogStore'

const weeks = [...new Set(PROGRAMME.map((day) => day.week))].map((week) => ({
  week,
  days: PROGRAMME.filter((day) => day.week === week),
}))

export function ProgrammeOverview({
  dateKey,
  onOpenWorkout,
}: {
  /** The viewed date; a workout with no saved log opens on it. */
  dateKey: string
  onOpenWorkout: (dateKey: string, day: string) => void
}) {
  const theme = useTheme()
  const { width, fontScale } = useWindowDimensions()
  const started = useGymLogStore((s) => s.programmeStart !== null)
  const logs = useGymLogStore((s) => s.logs)
  const completedRestDays = useGymLogStore((s) => s.completedRestDays)
  const completeRestDay = useGymLogStore((s) => s.completeRestDay)
  const progress = useMemo(() => {
    const completed = new Set(completedRestDays)
    for (const log of Object.values(logs)) {
      if (log.finishedAt) completed.add(log.day)
    }
    // The day after the furthest completed one is next; earlier days stay open.
    const next = PROGRAMME.reduce(
      (index, day, i) => (completed.has(day.day) ? i + 1 : index),
      0,
    )
    return {
      completed,
      saved: savedWorkoutDates(logs),
      open: new Set(PROGRAMME.slice(0, next + 1).map((day) => day.day)),
      next: PROGRAMME[next]?.day,
    }
  }, [logs, completedRestDays])

  const describe = (
    day: ProgrammeDay,
  ): { hint?: string; press?: () => void } => {
    const saved = progress.saved.get(day.day)
    if (saved) {
      return {
        hint: 'Opens this workout',
        press: () => onOpenWorkout(saved, day.day),
      }
    }
    if (!started) return { hint: 'Start the programme to open this workout' }
    if (!progress.open.has(day.day)) {
      return { hint: 'Finish the earlier days to unlock this one' }
    }
    if (day.exercises.length === 0) {
      return progress.completed.has(day.day)
        ? {}
        : {
            hint: 'Marks this rest day complete',
            press: () => completeRestDay(day.day),
          }
    }
    return logs[dateKey]
      ? { hint: 'Another workout is saved on this date' }
      : {
          hint: 'Opens this workout',
          press: () => onOpenWorkout(dateKey, day.day),
        }
  }

  return (
    <View testID="gym-programme-overview" style={styles.content}>
      {weeks.map(({ week, days }) => (
        <View key={week} style={styles.week}>
          <Text
            accessibilityRole="header"
            style={[Typography.headingSm, { color: theme.text }]}
          >
            Week {week}
          </Text>
          <View style={styles.grid}>
            {days.map((day) => {
              const next = day.day === progress.next
              const completed = progress.completed.has(day.day)
              const { hint, press } = describe(day)
              return (
                <Pressable
                  key={day.day}
                  testID={`gym-programme-day-${day.day}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${day.day}: ${day.title}${completed ? ', completed' : ''}${next ? ', next day' : ''}`}
                  accessibilityState={{ disabled: !press }}
                  accessibilityHint={hint}
                  disabled={!press}
                  onPress={press}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      width:
                        fontScale > 1.5
                          ? '100%'
                          : width >= 600 && fontScale <= 1
                            ? '23.5%'
                            : '49%',
                      opacity: !press && !completed ? 0.5 : pressed ? 0.7 : 1,
                      borderColor: next
                        ? theme.accent
                        : completed
                          ? theme.success
                          : theme.border,
                      backgroundColor: next
                        ? theme.accentInactive
                        : completed
                          ? theme.successInactive
                          : theme.cardBackground,
                    },
                  ]}
                >
                  <Text style={[Typography.headingMd, { color: theme.accent }]}>
                    DAY {day.day}
                  </Text>
                  <Text style={[Typography.bodySm, { color: theme.text }]}>
                    {day.title}
                  </Text>
                  {completed && (
                    <View style={styles.completion}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color={theme.success}
                        accessible={false}
                      />
                      <Text
                        style={[
                          Typography.labelMd,
                          { color: theme.success, flexShrink: 1 },
                        ]}
                      >
                        Completed
                      </Text>
                    </View>
                  )}
                  {next && (
                    <Text style={[Typography.labelMd, { color: theme.accent }]}>
                      Next day
                    </Text>
                  )}
                </Pressable>
              )
            })}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  content: { gap: Spacing.xl },
  week: { gap: Spacing.sm },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: '2%',
    rowGap: Spacing.xs,
  },
  card: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  completion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
})
