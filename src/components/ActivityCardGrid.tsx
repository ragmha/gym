import Ionicons from '@expo/vector-icons/Ionicons'
import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Line, Polyline } from 'react-native-svg'

import { useTheme } from '@/hooks/useThemeColor'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// ── Walk Card with circular progress ────────────────────────────────

interface WalkCardProps {
  steps: number
  goal: number
}

const RING_SIZE = 100
const RING_CENTER = RING_SIZE / 2
const RING_STROKE = 8
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRC = 2 * Math.PI * RING_RADIUS

function WalkCard({ steps, goal }: WalkCardProps) {
  const {
    text: textColor,
    subtitleText: subtitleColor,
    cardSurface: cardBg,
  } = useTheme()

  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withTiming(Math.min(steps / goal, 1), { duration: 1000 })
  }, [steps, goal, progress])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRC * (1 - progress.value),
  }))

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Walk</Text>
        <Ionicons name="walk-outline" size={20} color={subtitleColor} />
      </View>
      <View style={styles.walkRingContainer}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          <Circle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            stroke="rgba(59,130,246,0.15)"
            strokeWidth={RING_STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_CENTER}
            cy={RING_CENTER}
            r={RING_RADIUS}
            stroke="#3B82F6"
            strokeWidth={RING_STROKE}
            fill="none"
            strokeDasharray={`${RING_CIRC}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
            animatedProps={animatedProps}
          />
        </Svg>
        <View style={styles.walkRingLabel}>
          <Text style={[styles.walkStepCount, { color: textColor }]}>
            {steps.toLocaleString()}
          </Text>
          <Text style={[styles.walkStepUnit, { color: subtitleColor }]}>
            Steps
          </Text>
        </View>
      </View>
    </View>
  )
}

// ── Sleep Card with bar chart ───────────────────────────────────────

interface SleepCardProps {
  hours: number
}

function SleepCard({ hours }: SleepCardProps) {
  const {
    text: textColor,
    subtitleText: subtitleColor,
    cardSurface: cardBg,
  } = useTheme()

  const bars = [0.5, 0.7, 0.9, 1.0, 0.8, 0.6, 0.9]
  const barWidth = 8
  const barGap = 6
  const chartHeight = 50

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Sleep</Text>
        <Ionicons name="moon-outline" size={18} color={subtitleColor} />
      </View>
      <View style={styles.barChartContainer}>
        <Svg width={bars.length * (barWidth + barGap)} height={chartHeight}>
          {bars.map((h, i) => (
            <Line
              key={i}
              x1={i * (barWidth + barGap) + barWidth / 2}
              y1={chartHeight}
              x2={i * (barWidth + barGap) + barWidth / 2}
              y2={chartHeight * (1 - h)}
              stroke="#3B82F6"
              strokeWidth={barWidth}
              strokeLinecap="round"
            />
          ))}
        </Svg>
      </View>
      <Text style={[styles.cardValue, { color: textColor }]}>{hours}</Text>
      <Text style={[styles.cardUnit, { color: subtitleColor }]}>Hours</Text>
    </View>
  )
}

// ── Water Card with bar chart ───────────────────────────────────────

interface WaterCardProps {
  bottles: number
}

function WaterCard({ bottles }: WaterCardProps) {
  const {
    text: textColor,
    subtitleText: subtitleColor,
    cardSurface: cardBg,
  } = useTheme()

  const bars = [0.6, 0.8, 0.4]
  const barWidth = 12
  const barGap = 10
  const chartHeight = 44

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Water</Text>
        <Ionicons name="water-outline" size={18} color={subtitleColor} />
      </View>
      <View style={styles.barChartContainer}>
        <Svg width={bars.length * (barWidth + barGap)} height={chartHeight}>
          {bars.map((h, i) => (
            <Line
              key={i}
              x1={i * (barWidth + barGap) + barWidth / 2}
              y1={chartHeight}
              x2={i * (barWidth + barGap) + barWidth / 2}
              y2={chartHeight * (1 - h)}
              stroke="#3B82F6"
              strokeWidth={barWidth}
              strokeLinecap="round"
            />
          ))}
        </Svg>
        <View style={styles.waterDots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.waterDot,
                {
                  backgroundColor:
                    i < bottles ? '#3B82F6' : 'rgba(59,130,246,0.2)',
                },
              ]}
            />
          ))}
        </View>
      </View>
      <Text style={[styles.cardValue, { color: textColor }]}>{bottles}</Text>
      <Text style={[styles.cardUnit, { color: subtitleColor }]}>Bottles</Text>
    </View>
  )
}

// ── Heart Card with ECG line ────────────────────────────────────────

interface HeartCardProps {
  bpm: number
}

function HeartCard({ bpm }: HeartCardProps) {
  const {
    text: textColor,
    subtitleText: subtitleColor,
    cardSurface: cardBg,
  } = useTheme()

  const ecgPoints =
    '0,30 15,30 25,30 35,28 40,30 50,30 55,10 60,45 65,5 70,40 75,30 85,30 95,28 100,30 115,30 125,30 130,28 135,30 140,30'

  return (
    <View style={[styles.card, { backgroundColor: cardBg }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: textColor }]}>Heart</Text>
        <Ionicons name="heart-outline" size={18} color={subtitleColor} />
      </View>
      <View style={styles.ecgContainer}>
        <Svg width={140} height={50} viewBox="0 0 140 50">
          <Polyline
            points={ecgPoints}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <Text style={[styles.cardValue, { color: textColor }]}>{bpm}</Text>
      <Text style={[styles.cardUnit, { color: subtitleColor }]}>bpm</Text>
    </View>
  )
}

// ── Grid container ──────────────────────────────────────────────────

interface ActivityCardGridProps {
  steps: number
  stepsGoal: number
  sleepHours: number
  waterBottles: number
  heartRate: number
}

export function ActivityCardGrid({
  steps,
  stepsGoal,
  sleepHours,
  waterBottles,
  heartRate,
}: ActivityCardGridProps) {
  const { text: textColor } = useTheme()

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        Your activity
      </Text>
      <View style={styles.grid}>
        <WalkCard steps={steps} goal={stepsGoal} />
        <SleepCard hours={sleepHours} />
        <WaterCard bottles={waterBottles} />
        <HeartCard bpm={heartRate} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    borderRadius: 20,
    padding: 16,
    minHeight: 170,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  walkRingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  walkRingLabel: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  walkStepCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  walkStepUnit: {
    fontSize: 11,
    fontWeight: '500',
  },
  barChartContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  ecgContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 8,
  },
  cardUnit: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  waterDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  waterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
