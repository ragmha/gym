import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { ActivityScreen } from '@/components/gym/ActivityDetail'
import { ChipTabs } from '@/components/gym/FoodWeekCard'
import { WeightChart } from '@/components/gym/WeightChart'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { HealthReadState } from '@/components/health/HealthReadState'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { morningWeighIns, summarizeMorningWeights } from '@/lib/dailyGoals'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type {
  DailyHealthSnapshot,
  HealthBodyMassSample,
} from '@/lib/healthSnapshot/types'
import {
  BMI_SCALE,
  bmiGaugePosition,
  bodyMassIndex,
  goalProgress,
  goalStatus,
  recentChanges,
  steppedGoal,
  WEIGHT_RANGE_DAYS,
  weighInsEnding,
  weightBars,
  type GoalStatus,
  type WeightRange,
} from '@/lib/weightTrend'
import { useThemeStore } from '@/stores/ThemeStore'

const RANGES: readonly WeightRange[] = ['2W', '3M', '6M']
const HISTORY_DAYS = WEIGHT_RANGE_DAYS['6M']

export default function WeightScreen() {
  return (
    <HealthDateRoute>{(date) => <WeightForDate date={date} />}</HealthDateRoute>
  )
}

// Six months of weigh-ins, reread (keeping the last result) whenever the
// day's snapshot refreshes, such as after returning from Add weight.
function useWeightHistory(
  date: Date,
  refreshSnapshot: DailyHealthSnapshot | null,
) {
  const key = localDateKey(date)
  const requestRef = useRef(0)
  const [state, setState] = useState<{
    key: string
    samples: HealthBodyMassSample[] | null
    failed: boolean
  }>({ key: '', samples: null, failed: false })

  const load = useCallback(async () => {
    const request = ++requestRef.current
    setState((prev) => (prev.failed ? { ...prev, failed: false } : prev))
    try {
      const samples = await healthSnapshot.getBodyMassHistory(
        date,
        HISTORY_DAYS,
      )
      if (requestRef.current === request) {
        setState({ key, samples, failed: false })
      }
    } catch {
      if (requestRef.current === request) {
        setState({ key, samples: null, failed: true })
      }
    }
    // `key` identifies the day.
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
    samples: current ? state.samples : null,
    failed: current && state.failed,
    load,
  }
}

function useHeightMeters(refreshSnapshot: DailyHealthSnapshot | null) {
  const [meters, setMeters] = useState<number | null>(null)
  useEffect(() => {
    let active = true
    healthSnapshot.getHeightMeters().then(
      (value) => active && setMeters(value),
      () => active && setMeters(null),
    )
    return () => {
      active = false
    }
  }, [refreshSnapshot])
  return meters
}

const kg = (value: number) => `${value.toFixed(1)} kg`

function statusText(status: GoalStatus | null, goalKg: number | null) {
  if (goalKg === null) return 'No goal set'
  if (status === null) return '-- kg to goal'
  if (status.kind === 'atGoal') return 'At goal'
  if (status.kind === 'reached') return 'Goal reached'
  return `${status.kilograms.toFixed(1)} kg to goal`
}

function shortDate(sample: HealthBodyMassSample) {
  return new Date(sample.startISO).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}

function timeOf(sample: HealthBodyMassSample) {
  return new Date(sample.startISO).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function lastWeighIn(sample: HealthBodyMassSample) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const day = localDateKey(new Date(sample.startISO))
  const label =
    day === localDateKey(today)
      ? 'Today'
      : day === localDateKey(yesterday)
        ? 'Yesterday'
        : shortDate(sample)
  return `Last weigh-in: ${label}, ${timeOf(sample)}`
}

function WeightForDate({ date }: { date: Date }) {
  const theme = useTheme()
  const router = useRouter()
  const { snapshot } = useHealthSnapshot(date)
  const { samples, failed, load } = useWeightHistory(date, snapshot)
  const heightMeters = useHeightMeters(snapshot)
  const [range, setRange] = useState<WeightRange>('2W')
  const storedGoal = useThemeStore((state) => state.weightGoalKg)
  const setGoal = useThemeStore((state) => state.setWeightGoalKg)
  const goalKg =
    typeof storedGoal === 'number' && Number.isFinite(storedGoal)
      ? storedGoal
      : null

  const history = samples ?? snapshot?.bodyMassHistory ?? null
  const mornings = morningWeighIns(history)
  const weighIns = weighInsEnding(mornings, date)
  const latest = weighIns[weighIns.length - 1] ?? null
  // Only the full history read can show that there are no weigh-ins.
  const unknown = samples === null && latest === null
  // Start and progress need the full history, not the 14-day snapshot.
  const start = samples === null ? null : (weighIns[0] ?? null)
  const nowKg = latest?.kilograms ?? null
  const status =
    samples === null
      ? null
      : goalStatus(start?.kilograms ?? null, nowKg, goalKg)
  const progress =
    status === null
      ? null
      : status.kind === 'toGoal'
        ? goalProgress(start?.kilograms ?? null, nowKg, goalKg)
        : 1
  const week = summarizeMorningWeights(history, date)
  const change =
    week.currentAverageKg !== null && week.previousAverageKg !== null
      ? week.currentAverageKg - week.previousAverageKg
      : null
  const bmi = bodyMassIndex(nowKg, heightMeters)
  const mono = [styles.mono, { color: theme.subtitleText }]
  const card = [
    styles.card,
    { backgroundColor: theme.homeBackground, borderColor: theme.goalTrack },
  ]
  const stepGoal = (direction: 1 | -1) =>
    setGoal(steppedGoal(goalKg, nowKg, direction))

  return (
    <ActivityScreen testID="gym-weight-screen" title="Weight" date={date}>
      <View style={styles.hero}>
        <View
          style={styles.reading}
          accessible
          accessibilityLabel={
            nowKg !== null
              ? `Latest morning weigh-in: ${kg(nowKg)}`
              : unknown
                ? 'Latest morning weigh-in unavailable'
                : 'No morning weigh-in yet'
          }
        >
          <Text
            testID="weight-hero"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[Typography.displayXl, styles.number, { color: theme.text }]}
          >
            {nowKg === null ? '--' : nowKg.toFixed(1)}
          </Text>
          <Text style={[styles.unit, { color: theme.subtitleText }]}>kg</Text>
        </View>
        <View style={styles.heroFooter}>
          <View style={styles.heroCaptions}>
            <Text
              testID="weight-goal-status"
              style={[
                styles.status,
                {
                  color:
                    goalKg === null ? theme.subtitleText : theme.weightGoalText,
                },
              ]}
            >
              {statusText(status, goalKg)}
            </Text>
            <Text style={mono}>
              {latest
                ? lastWeighIn(latest)
                : unknown
                  ? '--'
                  : 'No morning weigh-in yet'}
            </Text>
          </View>
          <Pressable
            testID="gym-add-weight"
            accessibilityRole="button"
            accessibilityLabel="Add weight"
            onPress={() =>
              router.push({
                pathname: '/add-weight',
                params: { date: localDateKey(date) },
              })
            }
            style={({ pressed }) => [
              styles.add,
              { backgroundColor: theme.text, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="add" size={36} color={theme.homeBackground} />
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <ChipTabs options={RANGES} selected={range} onSelect={setRange} />
        {failed ? (
          <HealthReadState
            error="Unable to load weight history"
            onRetry={() => void load()}
          />
        ) : samples === null ? (
          <HealthReadState loading />
        ) : (
          <WeightChart
            bars={weightBars(mornings, date, range)}
            range={range}
            goalKg={goalKg}
          />
        )}
      </View>

      <View style={styles.stats}>
        <Stat
          label="7-day avg"
          value={
            week.currentAverageKg === null
              ? '--'
              : week.currentAverageKg.toFixed(1)
          }
        />
        <Stat
          label="vs last week"
          value={
            change === null
              ? '--'
              : `${change > 0 ? '+' : ''}${change.toFixed(1)}`
          }
        />
      </View>

      <View testID="weight-goal-card" style={card}>
        <View style={styles.stats}>
          <Stat
            label="Start"
            value={start ? start.kilograms.toFixed(1) : '--'}
            detail={start ? shortDate(start) : undefined}
          />
          <Stat label="Now" value={nowKg === null ? '--' : nowKg.toFixed(1)} />
          <Stat label="Goal" value={goalKg === null ? '--' : `${goalKg}`} />
        </View>
        <View
          testID="weight-goal-progress"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Progress to goal"
          accessibilityValue={
            progress === null
              ? { text: 'Not available' }
              : { min: 0, max: 100, now: Math.round(progress * 100) }
          }
          style={[styles.track, { backgroundColor: theme.goalTrack }]}
        >
          {progress !== null && (
            <View
              style={[
                styles.fill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: theme.weightBarStart,
                },
              ]}
            />
          )}
        </View>
        <View style={styles.goalRow}>
          <Text style={[mono, styles.goalLabel]}>Goal weight</Text>
          {(
            [
              [-1, 'remove', 'Lower goal weight'],
              [1, 'add', 'Raise goal weight'],
            ] as const
          ).map(([direction, icon, label]) => (
            <Pressable
              key={icon}
              testID={`weight-goal-${icon}`}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityValue={{
                text: goalKg === null ? 'Not set' : `${goalKg} kg`,
              }}
              onPress={() => stepGoal(direction)}
              style={({ pressed }) => [
                styles.step,
                {
                  backgroundColor: theme.homeSurface,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name={icon} size={24} color={theme.text} />
            </Pressable>
          ))}
        </View>
      </View>

      <View testID="weight-bmi" style={card}>
        <View
          style={styles.cardHeader}
          accessible
          accessibilityLabel={
            bmi === null ? 'BMI unavailable' : `BMI ${bmi.toFixed(1)}`
          }
        >
          <Text style={mono}>BMI</Text>
          <Text style={[styles.cardValue, { color: theme.text }]}>
            {bmi === null ? '--' : bmi.toFixed(1)}
          </Text>
        </View>
        <BmiGauge bmi={bmi} />
        <Text style={[styles.caption, { color: theme.subtitleText }]}>
          {heightMeters === null
            ? 'Add your height in Apple Health, then review Health access in Settings.'
            : "Uses your latest weigh-in and Apple Health height. BMI doesn't reflect muscle mass."}
        </Text>
      </View>

      <View testID="weight-history" style={card}>
        <Text style={mono}>History</Text>
        {weighIns.length === 0 ? (
          <Text style={[styles.caption, { color: theme.subtitleText }]}>
            {unknown ? '--' : 'No morning weigh-ins yet'}
          </Text>
        ) : (
          recentChanges(weighIns, 7).map(({ sample, changeKg }) => (
            <View
              key={sample.startISO}
              style={styles.row}
              accessible
              accessibilityLabel={`${new Date(
                sample.startISO,
              ).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}, ${timeOf(sample)}, ${kg(sample.kilograms)}${
                changeKg === null || changeKg === 0
                  ? ''
                  : `, ${changeKg > 0 ? 'up' : 'down'} ${kg(Math.abs(changeKg))}`
              }`}
            >
              <View style={styles.rowDate}>
                <Text style={[styles.rowTitle, { color: theme.text }]}>
                  {new Date(sample.startISO).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={mono}>{timeOf(sample)}</Text>
              </View>
              <Text style={[styles.rowValue, { color: theme.text }]}>
                {kg(sample.kilograms)}
              </Text>
              <View style={styles.change}>
                {changeKg !== null && changeKg !== 0 && (
                  <Ionicons
                    name={changeKg > 0 ? 'arrow-up' : 'arrow-down'}
                    size={14}
                    color={theme.subtitleText}
                  />
                )}
                <Text style={mono}>
                  {changeKg === null ? ' ' : Math.abs(changeKg).toFixed(1)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ActivityScreen>
  )
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  const theme = useTheme()
  const mono = [styles.mono, { color: theme.subtitleText }]
  return (
    <View
      style={styles.stat}
      accessible
      accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ''}`}
    >
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={mono}>{label}</Text>
      {detail && <Text style={mono}>{detail}</Text>}
    </View>
  )
}

/** Neutral 15–40 scale split at the adult cut-offs; no colour verdict. */
function BmiGauge({ bmi }: { bmi: number | null }) {
  const theme = useTheme()
  const { fontScale } = useWindowDimensions()
  const bounds = [BMI_SCALE.min, ...BMI_SCALE.cutoffs, BMI_SCALE.max]
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.gauge}>
        {bounds.slice(1).map((end, index) => (
          <View
            key={end}
            style={[
              styles.segment,
              { flex: end - bounds[index], backgroundColor: theme.goalTrack },
            ]}
          />
        ))}
        {bmi !== null && (
          <View
            testID="weight-bmi-marker"
            style={[
              styles.marker,
              {
                left: `${bmiGaugePosition(bmi) * 100}%`,
                backgroundColor: theme.text,
              },
            ]}
          />
        )}
      </View>
      <View
        testID="weight-bmi-ticks"
        style={[styles.ticks, { height: styles.ticks.height * fontScale }]}
      >
        {BMI_SCALE.cutoffs.map((cutoff) => (
          <Text
            key={cutoff}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.mono,
              styles.tick,
              {
                color: theme.subtitleText,
                left: `${bmiGaugePosition(cutoff) * 100}%`,
              },
            ]}
          >
            {cutoff}
          </Text>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  hero: { alignSelf: 'stretch', gap: Spacing.xs },
  reading: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
  number: { flexShrink: 1 },
  unit: { ...Typography.headingLg },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  heroCaptions: { flex: 1, gap: Spacing.xxs },
  status: {
    fontFamily: 'SpaceMono',
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  add: {
    width: 64,
    height: 64,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { alignSelf: 'stretch', gap: Spacing.sm },
  stats: { flexDirection: 'row', alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  statValue: {
    fontFamily: 'SpaceMono',
    fontSize: 24,
    lineHeight: 30,
    fontVariant: ['tabular-nums'],
  },
  card: {
    alignSelf: 'stretch',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  track: { height: 8, borderRadius: Radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radii.pill },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  goalLabel: { flex: 1 },
  step: {
    width: Layout.controlSize,
    height: Layout.controlSize,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cardValue: {
    fontFamily: 'SpaceMono',
    fontSize: 28,
    lineHeight: 36,
    fontVariant: ['tabular-nums'],
  },
  gauge: { flexDirection: 'row', gap: 3, height: 8 },
  segment: { borderRadius: Radii.pill },
  marker: {
    position: 'absolute',
    top: -5,
    width: 4,
    height: 18,
    marginLeft: -2,
    borderRadius: 2,
  },
  ticks: { height: 18, marginTop: Spacing.xxs },
  tick: {
    position: 'absolute',
    width: 40,
    marginLeft: -20,
    textAlign: 'center',
  },
  caption: { ...Typography.bodySm },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rowDate: { flex: 1, gap: 2 },
  rowTitle: { ...Typography.headingXs },
  rowValue: {
    fontFamily: 'SpaceMono',
    fontSize: 16,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  change: {
    width: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
})
