import { Ionicons } from '@expo/vector-icons'
import React, { useEffect } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

import { useTheme } from '@/hooks/useThemeColor'

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max)
}

// ── Types ──────────────────────────────────────────────────────────────

export interface MetricRing {
  label: string
  /** Null is unavailable; zero is a recorded measurement. */
  value: number | null
  goal: number
  unit: string
  color: string
  icon: React.ComponentProps<typeof Ionicons>['name']
}

export interface FitnessRingsCardProps {
  metrics: MetricRing[]
  onPress?: () => void
}

// ── Constants ──────────────────────────────────────────────────────────

const RING_SIZE = 170
const RING_STROKE = 10
const RING_GAP = 4
const ANIM_DURATION = 1000

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// ── Animated ring ──────────────────────────────────────────────────────

function AnimatedRing({
  cx,
  cy,
  r,
  stroke,
  strokeWidth,
  progress,
  circumference,
}: {
  cx: number
  cy: number
  r: number
  stroke: string
  strokeWidth: number
  progress: number
  circumference: number
}) {
  const animValue = useSharedValue(0)

  useEffect(() => {
    animValue.value = withTiming(clamp(progress, 0, 1), {
      duration: ANIM_DURATION,
    })
  }, [progress, animValue])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animValue.value),
  }))

  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      r={r}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      strokeLinecap="round"
      strokeDasharray={`${circumference}`}
      animatedProps={animatedProps}
      transform={`rotate(-90 ${cx} ${cy})`}
    />
  )
}

// ── Main component ─────────────────────────────────────────────────────

export function FitnessRingsCard({ metrics, onPress }: FitnessRingsCardProps) {
  const { cardBackground, text: textColor, icon: subtextColor } = useTheme()

  const center = RING_SIZE / 2

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: cardBackground }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={metrics
        .map((metric) =>
          metric.value === null
            ? `${metric.label} unavailable`
            : `${metric.label} ${formatMetricValue(metric.value, metric.unit)}`,
        )
        .join('. ')}
    >
      {/* Top row: rings + legend */}
      <View style={styles.topRow}>
        {/* Concentric rings */}
        <View style={styles.ringsContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {metrics.map((m, i) => {
              const r = center - RING_STROKE / 2 - i * (RING_STROKE + RING_GAP)
              const circumference = 2 * Math.PI * r
              const progress =
                m.value !== null && m.goal > 0 ? m.value / m.goal : 0
              return (
                <React.Fragment key={m.label}>
                  {/* Background track */}
                  <Circle
                    cx={center}
                    cy={center}
                    r={r}
                    stroke={`${m.color}20`}
                    strokeWidth={RING_STROKE}
                    fill="none"
                  />
                  {/* Animated foreground */}
                  <AnimatedRing
                    cx={center}
                    cy={center}
                    r={r}
                    stroke={m.color}
                    strokeWidth={RING_STROKE}
                    progress={progress}
                    circumference={circumference}
                  />
                </React.Fragment>
              )
            })}
          </Svg>
        </View>

        {/* Category legend */}
        <View style={styles.legend}>
          {metrics.map((m) => {
            const display = formatMetricValue(m.value, m.unit)
            const goalDisplay = formatMetricValue(m.goal, m.unit)
            return (
              <View key={m.label} style={styles.legendRow}>
                <View
                  style={[
                    styles.legendIcon,
                    { backgroundColor: `${m.color}20` },
                  ]}
                >
                  <Ionicons name={m.icon} size={14} color={m.color} />
                </View>
                <View style={styles.legendText}>
                  <Text style={[styles.legendLabel, { color: textColor }]}>
                    {m.label}
                  </Text>
                  <Text style={[styles.legendValue, { color: subtextColor }]}>
                    {display} / {goalDisplay}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatMetricValue(value: number | null, unit: string): string {
  if (value === null) return '--'
  if (value >= 10_000) return `${(value / 1000).toFixed(1)}k ${unit}`
  if (value >= 1_000) return `${value.toLocaleString()} ${unit}`
  if (Number.isInteger(value)) return `${value} ${unit}`
  return `${value.toFixed(1)} ${unit}`
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ringsContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
  legend: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 12,
    marginTop: 1,
  },
})
