import { StyleSheet, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

const SIZE = 140
const STROKE = 12
const R = (SIZE - STROKE) / 2
const C = SIZE / 2
const D = R * Math.SQRT1_2
// 270° from bottom-left over the top to bottom-right, open at the bottom.
const ARC = `M ${C - D} ${C + D} A ${R} ${R} 0 1 1 ${C + D} ${C + D}`
const ARC_LENGTH = (R * 3 * Math.PI) / 2

type Macros = {
  protein: number | null
  carbs: number | null
  fat: number | null
}

const MACROS = [
  { key: 'protein', label: 'Protein', color: 'accent' },
  { key: 'carbs', label: 'Carbs', color: 'metricCalories' },
  { key: 'fat', label: 'Fat', color: 'metricSleep' },
] as const

const show = (value: number | null) => (value === null ? '--' : `${value}`)

/** The day's budget: goal plus workouts against food eaten, then macro grams against targets. */
export function FoodBudgetCard({
  goalKcal,
  eatenKcal,
  exerciseKcal,
  grams,
  targets,
}: {
  goalKcal: number
  eatenKcal: number | null
  exerciseKcal: number | null
  grams: Macros
  targets: Macros
}) {
  const theme = useTheme()
  const budget = exerciseKcal === null ? null : goalKcal + exerciseKcal
  const left = eatenKcal === null || budget === null ? null : budget - eatenKcal
  const progress =
    eatenKcal === null || budget === null ? 0 : Math.min(eatenKcal / budget, 1)
  const mono = [styles.mono, { color: theme.subtitleText }]

  return (
    <View
      testID="food-budget"
      style={[styles.card, { backgroundColor: theme.homeSurface }]}
    >
      <Text
        accessibilityRole="header"
        style={[Typography.headingSm, { color: theme.text }]}
      >
        Budget: {goalKcal} kcal
      </Text>
      <View style={styles.gaugeRow}>
        <Stat label="Food" value={show(eatenKcal)} />
        <View
          style={styles.gauge}
          accessible
          accessibilityLabel={
            left === null
              ? 'Remaining budget unavailable'
              : `${Math.abs(left)} kcal ${left >= 0 ? 'under' : 'over'} budget`
          }
        >
          <Svg width={SIZE} height={SIZE}>
            <Path
              d={ARC}
              fill="none"
              stroke={theme.goalTrack}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
            {progress > 0 && (
              <Path
                d={ARC}
                fill="none"
                stroke={
                  left !== null && left < 0 ? theme.danger : theme.success
                }
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={[ARC_LENGTH * progress, ARC_LENGTH]}
              />
            )}
          </Svg>
          <View style={styles.gaugeCenter}>
            <Text style={[styles.left, { color: theme.text }]}>
              {left === null ? '--' : Math.abs(left)}
            </Text>
            <Text style={mono}>
              {left === null ? 'Left' : left >= 0 ? 'Under' : 'Over'}
            </Text>
          </View>
        </View>
        <Stat label="Exercise" value={show(exerciseKcal)} />
      </View>
      <View style={styles.macros}>
        {MACROS.map(({ key, label, color }) => {
          const value = grams[key]
          const target = targets[key]
          const fill =
            value && target !== null ? Math.min(value / target, 1) : 0
          return (
            <View
              key={key}
              style={styles.macro}
              accessible
              accessibilityLabel={`${label}: ${show(value)} of ${show(target)} g`}
            >
              <Text style={mono}>{label}</Text>
              <View
                style={[styles.track, { backgroundColor: theme.goalTrack }]}
              >
                <View
                  style={[
                    styles.track,
                    { width: `${fill * 100}%`, backgroundColor: theme[color] },
                  ]}
                />
              </View>
              <Text style={[styles.grams, { color: theme.text }]}>
                {show(value)}/{show(target)} g
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  const theme = useTheme()
  return (
    <View
      style={styles.stat}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.mono, { color: theme.subtitleText }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderCurve: 'continuous',
  },
  gaugeRow: { flexDirection: 'row', alignItems: 'center' },
  gauge: { width: SIZE, height: SIZE },
  gaugeCenter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: {
    fontFamily: 'SpaceMono',
    fontSize: 28,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },
  stat: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  statValue: {
    fontFamily: 'SpaceMono',
    fontSize: 20,
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  macros: { flexDirection: 'row', gap: Spacing.sm },
  macro: { flex: 1, gap: Spacing.xxs },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  grams: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
})
