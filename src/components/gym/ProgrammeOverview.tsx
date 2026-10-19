import { Ionicons } from '@expo/vector-icons'
import { useMemo } from 'react'
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { PROGRAMME } from '@/lib/gymProgramme'
import { useGymLogStore } from '@/stores/GymLogStore'

const weeks = [...new Set(PROGRAMME.map((day) => day.week))].map((week) => ({
  week,
  days: PROGRAMME.filter((day) => day.week === week),
}))

export function ProgrammeOverview({
  selectedDay,
  workoutDates,
  availableThrough,
  onSelectWorkout,
}: {
  selectedDay?: string
  workoutDates: ReadonlyMap<string, string>
  availableThrough: string
  onSelectWorkout: (dateKey: string) => void
}) {
  const theme = useTheme()
  const { width, fontScale } = useWindowDimensions()
  const logs = useGymLogStore((s) => s.logs)
  const completedDays = useMemo(
    () =>
      new Set(
        Object.values(logs)
          .filter((log) => log.finishedAt)
          .map((log) => log.day),
      ),
    [logs],
  )
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
              const selected = day.day === selectedDay
              const completed = completedDays.has(day.day)
              const scheduledKey = workoutDates.get(day.day)
              const dateKey =
                scheduledKey && scheduledKey <= availableThrough
                  ? scheduledKey
                  : undefined
              return (
                <Pressable
                  key={day.day}
                  testID={`gym-programme-day-${day.day}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${day.day}: ${day.title}${completed ? ', completed' : ''}${selected ? ', selected day' : ''}`}
                  accessibilityState={{ disabled: !dateKey }}
                  accessibilityHint={
                    dateKey
                      ? 'Opens this workout'
                      : scheduledKey
                        ? `Available on ${new Date(
                            `${scheduledKey}T12:00:00`,
                          ).toLocaleDateString(undefined, {
                            month: 'long',
                            day: 'numeric',
                          })}`
                        : 'No available workout date. Start or restart the programme to schedule this day.'
                  }
                  disabled={!dateKey}
                  onPress={dateKey ? () => onSelectWorkout(dateKey) : undefined}
                  style={({ pressed }) => [
                    styles.card,
                    {
                      width:
                        fontScale > 1.5
                          ? '100%'
                          : width >= 600 && fontScale <= 1
                            ? '23.5%'
                            : '49%',
                      opacity: !dateKey ? 0.5 : pressed ? 0.7 : 1,
                      borderColor: selected
                        ? theme.accent
                        : completed
                          ? theme.success
                          : theme.border,
                      backgroundColor: selected
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
                  {selected && (
                    <Text style={[Typography.labelMd, { color: theme.accent }]}>
                      Selected day
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
