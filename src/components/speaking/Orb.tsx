import { useMemo } from 'react'
import Animated, {
  useReducedMotion,
  type CSSAnimationKeyframes,
} from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'

const SPIN = {
  from: { transform: [{ rotate: '0deg' }] },
  to: { transform: [{ rotate: '360deg' }] },
} satisfies CSSAnimationKeyframes

const BREATHE = {
  '0%': { transform: [{ scale: 1 }] },
  '50%': { transform: [{ scale: 1.05 }] },
  '100%': { transform: [{ scale: 1 }] },
} satisfies CSSAnimationKeyframes

const POINTS = 2600
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

const mix = (a: string, b: string, t: number) => {
  const channel = (hex: string, i: number) =>
    parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  return `rgb(${[0, 1, 2]
    .map((i) => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t))
    .join(',')})`
}

/**
 * Front half of a Fibonacci sphere with a rippled surface: small, cool dots
 * face the viewer and bright, warm dots crowd the folded rim. Built once;
 * motion is a native transform, so nothing re-renders per frame.
 */
function dots(size: number, [core, mid, rim]: [string, string, string]) {
  const r = size * 0.4
  const c = size / 2
  const out: { x: number; y: number; s: number; fill: string; o: number }[] = []
  for (let i = 0; i < POINTS; i++) {
    const y = 1 - (2 * (i + 0.5)) / POINTS
    const ring = Math.sqrt(1 - y * y)
    const x = Math.cos(GOLDEN * i) * ring
    const z = Math.sin(GOLDEN * i) * ring
    if (z < 0) continue
    const edge = 1 - z
    const wave = Math.sin(6 * x + 4 * y) * Math.cos(5 * y - 3 * x)
    // Gentle folds that grow toward the rim, like cloth wrapped round a ball.
    const ripple = 1 + edge * 0.07 * wave
    const t = Math.min(1, edge ** 1.4 * 1.3)
    out.push({
      x: c + r * ripple * x,
      y: c + r * ripple * y,
      s: size * (0.0035 + 0.0025 * edge),
      fill: t < 0.5 ? mix(core, mid, t * 2) : mix(mid, rim, t * 2 - 1),
      // Bright crests and dim troughs draw the ripples across the face.
      o: 0.45 + 0.35 * (0.5 + 0.5 * wave) + 0.2 * edge,
    })
  }
  return out
}

export function Orb({
  colors,
  size,
}: {
  colors: [string, string, string]
  size: number
}) {
  const still = useReducedMotion()
  const points = useMemo(() => dots(size, colors), [size, colors])
  return (
    <Animated.View
      style={{
        animationName: still ? 'none' : BREATHE,
        animationDuration: 4000,
        animationIterationCount: 'infinite',
        animationTimingFunction: 'ease-in-out',
      }}
    >
      <Animated.View
        style={{
          animationName: still ? 'none' : SPIN,
          animationDuration: 30000,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'linear',
        }}
      >
        <Svg width={size} height={size}>
          {points.map((p, i) => (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.s}
              fill={p.fill}
              opacity={p.o}
            />
          ))}
        </Svg>
      </Animated.View>
    </Animated.View>
  )
}
