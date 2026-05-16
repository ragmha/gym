import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'

const AnimatedPath = Animated.createAnimatedComponent(Path)

export interface RingData {
  /** Progress value between 0 and 1. */
  progress: number
  /** Active stroke colour. */
  color: string
  /** Inactive / background stroke colour. */
  bgColor: string
}

export interface ActivityRingsProps {
  /** Array of rings from outermost to innermost. */
  rings: RingData[]
  /** Overall view size (width & height). */
  size?: number
  /** Width of each ring stroke. */
  strokeWidth?: number
  /** Gap between rings. */
  gap?: number
  /** Animation duration in ms. */
  duration?: number
  /** Corner radius ratio (0–0.5). Higher = rounder. */
  cornerRatio?: number
  /** Content rendered in the centre. */
  children?: React.ReactNode
}

// ── SVG path helpers ────────────────────────────────────────────────

/** Build a closed rounded-rect path starting at top-center, going clockwise. */
function roundedRectPath(
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number,
): string {
  const x = cx - w / 2
  const y = cy - h / 2
  return [
    `M ${cx} ${y}`,
    `L ${x + w - r} ${y}`,
    `A ${r} ${r} 0 0 1 ${x + w} ${y + r}`,
    `L ${x + w} ${y + h - r}`,
    `A ${r} ${r} 0 0 1 ${x + w - r} ${y + h}`,
    `L ${x + r} ${y + h}`,
    `A ${r} ${r} 0 0 1 ${x} ${y + h - r}`,
    `L ${x} ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z',
  ].join(' ')
}

/** Perimeter of a rounded rectangle. */
function roundedRectPerimeter(w: number, h: number, r: number): number {
  return 2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r
}

// ── Main component ──────────────────────────────────────────────────

export function ActivityRings({
  rings,
  size = 240,
  strokeWidth = 16,
  gap = 6,
  duration = 1200,
  cornerRatio = 0.3,
  children,
}: ActivityRingsProps) {
  const center = size / 2

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {rings.map((ring, i) => {
          const inset = strokeWidth / 2 + i * (strokeWidth + gap)
          const rectSize = size - 2 * inset
          const cornerRadius = rectSize * cornerRatio
          const path = roundedRectPath(
            center,
            center,
            rectSize,
            rectSize,
            cornerRadius,
          )
          const perimeter = roundedRectPerimeter(
            rectSize,
            rectSize,
            cornerRadius,
          )

          return (
            <React.Fragment key={i}>
              {/* Background track */}
              <Path
                d={path}
                stroke={ring.bgColor}
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Animated foreground */}
              <AnimatedSquircleRing
                path={path}
                perimeter={perimeter}
                progress={ring.progress}
                color={ring.color}
                strokeWidth={strokeWidth}
                duration={duration}
              />
            </React.Fragment>
          )
        })}
      </Svg>
      {children && <View style={styles.center}>{children}</View>}
    </View>
  )
}

// ── Animated single ring ────────────────────────────────────────────

function AnimatedSquircleRing({
  path,
  perimeter,
  progress,
  color,
  strokeWidth,
  duration,
}: {
  path: string
  perimeter: number
  progress: number
  color: string
  strokeWidth: number
  duration: number
}) {
  const animatedProgress = useSharedValue(0)

  useEffect(() => {
    animatedProgress.value = withTiming(Math.min(Math.max(progress, 0), 1), {
      duration,
    })
  }, [progress, duration, animatedProgress])

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: perimeter * (1 - animatedProgress.value),
  }))

  return (
    <AnimatedPath
      d={path}
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
      strokeDasharray={`${perimeter}`}
      strokeLinecap="round"
      animatedProps={animatedProps}
    />
  )
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
