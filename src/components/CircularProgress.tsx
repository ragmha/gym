import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export interface CircularProgressProps {
  /** Current value (0 – maxValue). */
  value: number
  /** Maximum value (default 100). */
  maxValue?: number
  /** Outer radius of the circle in px. */
  radius?: number
  /** Width of the active stroke. */
  activeStrokeWidth?: number
  /** Width of the inactive (background) stroke. */
  inActiveStrokeWidth?: number
  /** Colour of the filled arc. */
  activeStrokeColor?: string
  /** Colour of the unfilled arc. */
  inActiveStrokeColor?: string
  /** Animation duration in ms. */
  duration?: number
  /** Optional render prop for the centre label. */
  children?: React.ReactNode
}

export function CircularProgress({
  value,
  maxValue = 100,
  radius = 40,
  activeStrokeWidth = 10,
  inActiveStrokeWidth = 10,
  activeStrokeColor = '#007AFF',
  inActiveStrokeColor = 'rgba(0,122,255,0.15)',
  duration = 1000,
  children,
}: CircularProgressProps) {
  const stroke = Math.max(activeStrokeWidth, inActiveStrokeWidth)
  const innerRadius = radius - stroke / 2
  const circumference = 2 * Math.PI * innerRadius
  const size = radius * 2

  const progress = useSharedValue(0)

  useEffect(() => {
    const clamped = Math.min(Math.max(value, 0), maxValue)
    progress.value = withTiming(maxValue > 0 ? clamped / maxValue : 0, {
      duration,
    })
  }, [value, maxValue, duration, progress])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }))

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={radius}
          cy={radius}
          r={innerRadius}
          stroke={inActiveStrokeColor}
          strokeWidth={inActiveStrokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={radius}
          cy={radius}
          r={innerRadius}
          stroke={activeStrokeColor}
          strokeWidth={activeStrokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${radius} ${radius})`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children && <View style={styles.label}>{children}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
