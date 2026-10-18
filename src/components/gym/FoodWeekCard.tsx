import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { MACROS, useEntrance } from '@/components/gym/FoodBudgetCard'
import { HealthReadState } from '@/components/health/HealthReadState'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type {
  DailyFoodLog,
  DailyHealthSnapshot,
} from '@/lib/healthSnapshot/types'

const WEEKS = ['3 wks ago', '2 wks ago', 'Last week', 'This week'] as const
const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]
const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const
const CHART_HEIGHT = 140

/** Monday-to-Sunday dates `weeksAgo` weeks before the week containing `date`. */
export function weekDays(date: Date, weeksAgo: number): Date[] {
  const monday = new Date(date)
  monday.setHours(12, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) - weeksAgo * 7)
  return DAYS.map((_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return day
  })
}

// Days after `date` are not read; they render as empty bars. Rereads, keeping
// the chart on screen, whenever `refreshSnapshot` changes.
function useWeekLogs(
  date: Date,
  weeksAgo: number,
  refreshSnapshot: DailyHealthSnapshot | null,
) {
  const days = weekDays(date, weeksAgo)
  const key = `${localDateKey(days[0])}:${localDateKey(date)}`
  const requestRef = useRef(0)
  const [state, setState] = useState<{
    key: string
    logs: (DailyFoodLog | null)[] | null
    failed: boolean
  }>({ key: '', logs: null, failed: false })

  const load = useCallback(async () => {
    const request = ++requestRef.current
    setState((prev) => (prev.failed ? { ...prev, failed: false } : prev))
    try {
      const end = localDateKey(date)
      const logs = await Promise.all(
        weekDays(date, weeksAgo).map((day) =>
          localDateKey(day) > end ? null : healthSnapshot.getFoodLog(day),
        ),
      )
      if (requestRef.current === request) setState({ key, logs, failed: false })
    } catch {
      if (requestRef.current === request) {
        setState({ key, logs: null, failed: true })
      }
    }
    // `key` covers both the week and the end date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  useEffect(() => {
    void load()
    return () => {
      requestRef.current += 1
    }
  }, [load, refreshSnapshot])

  const current = state.key === key
  return {
    logs: current ? state.logs : null,
    failed: current && state.failed,
    load,
  }
}

/** Stacked macro calories per day for one of the last four weeks, read from Apple Health. */
export function FoodWeekCard({
  date,
  refreshSnapshot,
}: {
  date: Date
  refreshSnapshot: DailyHealthSnapshot | null
}) {
  const theme = useTheme()
  const [weeksAgo, setWeeksAgo] = useState(0)
  const { logs, failed, load } = useWeekLogs(date, weeksAgo, refreshSnapshot)
  const mono = [styles.mono, { color: theme.subtitleText }]

  return (
    <View style={styles.section}>
      <ChipTabs
        options={WEEKS}
        selected={WEEKS[WEEKS.length - 1 - weeksAgo]}
        onSelect={(label) =>
          setWeeksAgo(WEEKS.length - 1 - WEEKS.indexOf(label))
        }
      />
      <View
        testID="food-week"
        style={[
          styles.card,
          {
            backgroundColor: theme.homeBackground,
            borderColor: theme.goalTrack,
          },
        ]}
      >
        {failed ? (
          <HealthReadState
            error="Unable to load meals"
            onRetry={() => void load()}
          />
        ) : logs === null ? (
          <HealthReadState loading />
        ) : (
          <WeekChart logs={logs} />
        )}
      </View>
      <View style={styles.legend}>
        {MACROS.map(({ key, label, color }) => (
          <View key={key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: theme[color] }]} />
            <Text style={mono}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function ChipTabs<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: readonly T[]
  selected: T
  onSelect: (option: T) => void
}) {
  const theme = useTheme()
  return (
    <View style={styles.chips} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option === selected
        return (
          <Pressable
            key={option}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: active
                  ? theme.goalComplete
                  : theme.homeSurface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.mono,
                { color: active ? theme.goalOnComplete : theme.text },
              ]}
            >
              {option}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function WeekChart({ logs }: { logs: (DailyFoodLog | null)[] }) {
  const theme = useTheme()
  const t = useEntrance()
  const mono = [styles.mono, { color: theme.subtitleText }]
  const eaten = logs.map((log) =>
    log && log.meals.length > 0
      ? log.meals.reduce((sum, meal) => sum + meal.kcal, 0)
      : null,
  )
  const logged = eaten.filter((kcal): kcal is number => kcal !== null)
  const total = logged.reduce((sum, kcal) => sum + kcal, 0)
  const segments = logs.map((log) =>
    MACROS.map(({ key }) => (log?.[`${key}Grams`] ?? 0) * KCAL_PER_GRAM[key]),
  )
  // Days with meals but a macro Health could not read; their bars are partial.
  const partial = logs.map(
    (log, i) =>
      eaten[i] !== null &&
      MACROS.some(({ key }) => log?.[`${key}Grams`] == null),
  )
  const anyPartial = partial.some(Boolean)
  const max = Math.max(1, ...segments.map((day) => day[0] + day[1] + day[2]))

  return (
    <>
      <View style={styles.totals}>
        <Total label="Total kcal" value={logged.length ? `${total}` : '--'} />
        <Total
          label="Daily avg"
          value={logged.length ? `${Math.round(total / logged.length)}` : '--'}
        />
      </View>
      <View style={styles.chart}>
        {segments.map((day, i) => (
          <View
            key={i}
            style={styles.column}
            accessible
            accessibilityLabel={
              eaten[i] === null
                ? `${DAYS[i]}: no meals`
                : `${DAYS[i]}: ${eaten[i]} kcal, ${MACROS.map(
                    ({ key, label }) =>
                      `${label} ${logs[i]?.[`${key}Grams`] ?? '--'} g`,
                  ).join(', ')}`
            }
          >
            {anyPartial && (
              <Text
                testID={partial[i] ? 'food-week-missing' : undefined}
                style={mono}
              >
                {partial[i] ? '--' : ' '}
              </Text>
            )}
            <View style={[styles.bar, { height: CHART_HEIGHT }]}>
              {MACROS.map(({ key, color }, m) => (
                <View
                  key={key}
                  style={{
                    height: (day[m] / max) * CHART_HEIGHT * t,
                    backgroundColor: theme[color],
                  }}
                />
              ))}
            </View>
            <Text style={mono}>{DAYS[i][0]}</Text>
          </View>
        ))}
      </View>
      {anyPartial && (
        <Text style={[mono, styles.note]}>-- Some macros not in Health</Text>
      )}
    </>
  )
}

function Total({ label, value }: { label: string; value: string }) {
  const theme = useTheme()
  return (
    <View
      style={styles.total}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={[styles.mono, { color: theme.subtitleText }]}>{label}</Text>
      <Text style={[styles.totalValue, { color: theme.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { alignSelf: 'stretch', gap: Spacing.sm },
  chips: { alignSelf: 'stretch', flexDirection: 'row', gap: Spacing.xs },
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  card: {
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  totals: { flexDirection: 'row' },
  total: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  totalValue: {
    ...Typography.headingMd,
    fontFamily: 'SpaceMono',
    fontVariant: ['tabular-nums'],
  },
  chart: { flexDirection: 'row', gap: Spacing.xs },
  column: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  bar: {
    alignSelf: 'stretch',
    flexDirection: 'column-reverse',
    borderRadius: Radii.sm,
    overflow: 'hidden',
  },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.md },
  note: { textAlign: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  dot: { width: 8, height: 8, borderRadius: 4 },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
