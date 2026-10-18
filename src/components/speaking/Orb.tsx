import Animated, {
  useReducedMotion,
  type CSSAnimationKeyframes,
} from 'react-native-reanimated'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'

const SPIN = {
  from: { transform: [{ rotate: '0deg' }] },
  to: { transform: [{ rotate: '360deg' }] },
} satisfies CSSAnimationKeyframes

const BREATHE = {
  '0%': { transform: [{ scale: 1 }] },
  '50%': { transform: [{ scale: 1.04 }] },
  '100%': { transform: [{ scale: 1 }] },
} satisfies CSSAnimationKeyframes

export function Orb({
  colors,
  size,
  id,
}: {
  colors: [string, string]
  size: number
  id: string
}) {
  const still = useReducedMotion()
  const r = size / 2
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
          animationDuration: 12000,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'linear',
        }}
      >
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id={`orb-${id}`} x1="0.2" y1="0" x2="0.6" y2="1">
              <Stop offset="0.35" stopColor={colors[0]} />
              <Stop offset="1" stopColor={colors[1]} />
            </LinearGradient>
          </Defs>
          <Circle cx={r} cy={r} r={r} fill={`url(#orb-${id})`} />
        </Svg>
      </Animated.View>
    </Animated.View>
  )
}
