import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

import { useTheme } from '@/hooks/useThemeColor'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

interface RingData {
  label: string
  value: number
  goal: number
  unit: string
  color: string
  trackColor: string
}

interface DailyProgressRingsProps {
  sleepMinutes: number
  sleepGoalMinutes: number
  calories: number
  caloriesGoal: number
  steps: number
  stepsGoal: number
}

const RING_SIZE = 200
const CENTER = RING_SIZE / 2

function formatSleep(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}min`
}

function formatGoalSleep(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  return `${hrs}h`
}

interface AnimatedRingProps {
  radius: number
  strokeWidth: number
  color: string
  trackColor: string
  progress: number
}

function AnimatedRing({
  radius,
  strokeWidth,
  color,
  trackColor,
  progress,
}: AnimatedRingProps) {
  const circumference = 2 * Math.PI * radius
  const animatedProgress = useSharedValue(0)

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(progress, 1), {
      duration: 1200,
    })
  }, [progress, animatedProgress])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }))

  return (
    <>
      <Circle
        cx={CENTER}
        cy={CENTER}
        r={radius}
        stroke={trackColor}
        strokeWidth={strokeWidth}
        fill="none"
      />
      <AnimatedCircle
        cx={CENTER}
        cy={CENTER}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
        animatedProps={animatedProps}
      />
    </>
  )
}

export function DailyProgressRings({
  sleepMinutes,
  sleepGoalMinutes,
  calories,
  caloriesGoal,
  steps,
  stepsGoal,
}: DailyProgressRingsProps) {
  const { text: textColor, icon: subtextColor } = useTheme()

  const rings: RingData[] = [
    {
      label: 'Sleep',
      value: sleepMinutes,
      goal: sleepGoalMinutes,
      unit: '',
      color: '#5B9BD5',
      trackColor: 'rgba(91,155,213,0.2)',
    },
    {
      label: 'Calories',
      value: calories,
      goal: caloriesGoal,
      unit: '',
      color: '#E8707A',
      trackColor: 'rgba(232,112,122,0.2)',
    },
    {
      label: 'Steps',
      value: steps,
      goal: stepsGoal,
      unit: '',
      color: '#E8C558',
      trackColor: 'rgba(232,197,88,0.2)',
    },
  ]

  const strokeWidth = 14
  const gap = 6
  const outerRadius = RING_SIZE / 2 - strokeWidth / 2 - 4
  const radii = rings.map((_, i) => outerRadius - i * (strokeWidth + gap))

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        Daily progress
      </Text>
      <View style={styles.content}>
        <View style={styles.ringsContainer}>
          <Svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          >
            {rings.map((ring, i) => (
              <AnimatedRing
                key={ring.label}
                radius={radii[i]}
                strokeWidth={strokeWidth}
                color={ring.color}
                trackColor={ring.trackColor}
                progress={ring.goal > 0 ? ring.value / ring.goal : 0}
              />
            ))}
          </Svg>
        </View>
        <View style={styles.legend}>
          {rings.map((ring) => (
            <View key={ring.label} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: ring.color }]}
              />
              <View>
                <Text style={[styles.legendLabel, { color: subtextColor }]}>
                  {ring.label}
                </Text>
                <Text style={[styles.legendValue, { color: textColor }]}>
                  {ring.label === 'Sleep'
                    ? `${formatSleep(ring.value)}/${formatGoalSleep(ring.goal)}`
                    : `${ring.value.toLocaleString()}/${ring.goal.toLocaleString()}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ringsContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
  },
  legend: {
    flex: 1,
    marginLeft: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 1,
  },
  legendValue: {
    fontSize: 15,
    fontWeight: '700',
  },
})
