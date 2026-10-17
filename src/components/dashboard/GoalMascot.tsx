import { StyleSheet, type ViewStyle } from 'react-native'
import Animated, {
  useReducedMotion,
  type CSSAnimationKeyframes,
  type CSSStyle,
} from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'

import { useTheme } from '@/hooks/useThemeColor'

const ICONS = {
  steps:
    'M7 5.5C4.8 5.5 3.5 8 3.5 10.5c0 2 .8 3.6 1.6 4.5h3.8c.8-.9 1.6-2.5 1.6-4.5 0-2.5-1.3-5-3.5-5ZM5.2 17.5h3.6a1.8 1.8 0 0 1-3.6 0ZM17 2.5c-2.2 0-3.5 2.5-3.5 5 0 2 .8 3.6 1.6 4.5h3.8c.8-.9 1.6-2.5 1.6-4.5 0-2.5-1.3-5-3.5-5ZM15.2 14.5h3.6a1.8 1.8 0 0 1-3.6 0Z',
  cardio:
    'M12 20C12 20 3 14.6 3 8.6A4.6 4.6 0 0 1 12 6.5A4.6 4.6 0 0 1 21 8.6C21 14.6 12 20 12 20ZM7 12h2.5l1.5-3 2 6 1.5-3H17',
  stairs: 'M3 20h4.5v-4.5H12V11h4.5V6.5H21',
  lift: 'M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11',
  water: 'M12 3C12 3 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 3 12 3Z',
  weight:
    'M6 4h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3ZM8 11a4 4 0 0 1 8 0M12 11l2-2.5',
  reading:
    'M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5c2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5ZM12 6.5v13',
  praying:
    'M6 20v-7a6 6 0 0 1 3.5-5.5L12 4l2.5 3.5A6 6 0 0 1 18 13v7M4 20h16M10.5 20v-3a1.5 1.5 0 0 1 3 0v3',
  journal:
    'M7 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM3 7.5h4M3 12h4M3 16.5h4M10 8h6',
  speaking:
    'M12 4C7 4 3 7.4 3 11.5c0 2 1 3.9 2.6 5.2L5 20.5l4-1.8c1 .3 2 .3 3 .3c5 0 9-3.4 9-7.5S17 4 12 4Z',
}

export type GoalMascotKind = keyof typeof ICONS
export type GoalMascotMood = 'neutral' | 'sad' | 'happy'

const CELEBRATE = {
  '0%': { transform: [{ translateY: 0 }, { scale: 1 }] },
  '45%': { transform: [{ translateY: -5 }, { scale: 1.04 }] },
  '75%': { transform: [{ translateY: 0 }, { scale: 0.98 }] },
  '100%': { transform: [{ translateY: 0 }, { scale: 1 }] },
} satisfies CSSAnimationKeyframes

export function GoalMascot({
  kind,
  mood,
  color,
}: {
  kind: GoalMascotKind
  mood: GoalMascotMood
  color?: string
}) {
  const theme = useTheme()
  const reducedMotion = useReducedMotion()
  const motionStyle: CSSStyle<ViewStyle> = {
    animationName: !reducedMotion && mood === 'happy' ? CELEBRATE : 'none',
    animationDuration: 300,
    animationIterationCount: 1,
    animationTimingFunction: 'ease-in-out',
  }

  return (
    <Animated.View
      testID={`goal-mascot-${kind}-${mood}`}
      style={[styles.frame, motionStyle]}
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width="100%" height="100%" viewBox="0 0 24 24" focusable={false}>
        <Path
          d={ICONS[kind]}
          fill="none"
          stroke={color ?? theme.text}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: '44%',
    maxWidth: 56,
    aspectRatio: 1,
    flexShrink: 1,
    pointerEvents: 'none',
  },
})
