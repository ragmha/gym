import { Ionicons } from '@expo/vector-icons'
import React, { useEffect } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg'

import { clamp, seededRandom } from '@/components/MiniCharts'
import { useTheme } from '@/hooks/useThemeColor'

// ── Types ──────────────────────────────────────────────────────────────

export interface MetricRing {
  label: string
  value: number
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

// ── Mini area chart ────────────────────────────────────────────────────

function MiniAreaChart({
  color,
  width,
  height,
}: {
  color: string
  width: number
  height: number
}) {
  const rand = seededRandom('xp-chart')
  const points = 12
  const raw = Array.from({ length: points }, (_, i) => {
    const base = 0.3 + rand() * 0.4
    const wave = Math.sin((i / (points - 1)) * Math.PI * 1.5) * 0.25
    return clamp(base + wave, 0.05, 1)
  })
  const min = Math.min(...raw)
  const max = Math.max(...raw)
  const range = max - min || 1
  const pts = raw.map((v, i) => ({
    x: (i / (raw.length - 1)) * width,
    y: height - ((v - min) / range) * (height - 6) - 3,
  }))

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#areaGrad)" />
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
      />
    </Svg>
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
    >
      {/* Top row: rings + legend */}
      <View style={styles.topRow}>
        {/* Concentric rings */}
        <View style={styles.ringsContainer}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {metrics.map((m, i) => {
              const r = center - RING_STROKE / 2 - i * (RING_STROKE + RING_GAP)
              const circumference = 2 * Math.PI * r
              const progress = m.goal > 0 ? m.value / m.goal : 0
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

      {/* Mini area chart */}
      <View style={styles.chartContainer}>
        <MiniAreaChart
          color={metrics[0]?.color ?? '#3B82F6'}
          width={280}
          height={52}
        />
      </View>
    </TouchableOpacity>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────

function formatMetricValue(value: number, unit: string): string {
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
  chartContainer: {
    marginTop: 14,
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 8,
  },
})
