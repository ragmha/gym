import React, { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

import { useThemeColor } from '@/hooks/useThemeColor'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

interface RecoveryGaugeProps {
  recovery: number
  strain: number
  heartRate: number
  sleepPercent: number
}

const SIZE = 140
const CENTER = SIZE / 2
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function RecoveryGauge({
  recovery,
  strain,
  heartRate,
  sleepPercent,
}: RecoveryGaugeProps) {
  const textColor = useThemeColor({}, 'text')
  const subtitleColor = useThemeColor({}, 'subtitleText')
  const cardBg = useThemeColor({}, 'cardBackground')
  const borderColor = useThemeColor({}, 'border')

  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withTiming(Math.min(recovery / 100, 1), { duration: 1200 })
  }, [recovery, progress])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - progress.value),
  }))

  const gaugeColor =
    recovery >= 67 ? '#30D158' : recovery >= 34 ? '#E8C558' : '#E8707A'

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.row}>
        <View style={styles.gaugeContainer}>
          <Svg width={SIZE} height={SIZE}>
            <Circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              stroke={gaugeColor}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${CIRCUMFERENCE}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              animatedProps={animatedProps}
            />
          </Svg>
          <View style={styles.gaugeLabel}>
            <Text style={[styles.gaugeBigText, { color: textColor }]}>
              {recovery}%
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: subtitleColor }]}>
              Recovery
            </Text>
            <Text style={[styles.statValue, { color: gaugeColor }]}>
              {recovery}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: subtitleColor }]}>
              Strain
            </Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {strain.toFixed(1)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: subtitleColor }]}>HR</Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {heartRate}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: subtitleColor }]}>
              Sleep
            </Text>
            <Text style={[styles.statValue, { color: textColor }]}>
              {sleepPercent}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gaugeContainer: {
    width: SIZE,
    height: SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeLabel: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugeBigText: {
    fontSize: 26,
    fontWeight: '800',
  },
  statsGrid: {
    flex: 1,
    marginLeft: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  statItem: {
    width: '46%',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
})
