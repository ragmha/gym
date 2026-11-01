import { StyleSheet, type ViewStyle } from 'react-native'
import Animated, {
  useReducedMotion,
  type CSSAnimationKeyframes,
  type CSSStyle,
} from 'react-native-reanimated'
import Svg, { Path, Rect } from 'react-native-svg'

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
  focus: 'M12 21a8 8 0 1 0 0-16a8 8 0 0 0 0 16ZM12 9v4l2.5 2M10 2.5h4',
  food: 'M5 3v5a2.5 2.5 0 0 0 5 0V3M7.5 3v18M18.5 21V3c-2.2 1.2-3.5 3.8-3.5 7v3.5h3.5',
  trophy:
    'M7 5h10v4a5 5 0 0 1-10 0V5ZM7 7H4v1a4 4 0 0 0 4 4M17 7h3v1a4 4 0 0 1-4 4M12 14v4m-4 2h8m-7-2h6',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
}

export type GoalMascotKind = keyof typeof ICONS
export type GoalMascotMood = 'neutral' | 'sad' | 'happy'

const PIXEL_GLYPHS: Partial<Record<GoalMascotKind, readonly string[]>> = {
  steps: [
    '001100110',
    '011100111',
    '011100111',
    '001100110',
    '000100100',
    '000000000',
    '000110000',
    '001110000',
    '001110000',
  ],
  lift: [
    '000000000',
    '001010100',
    '001010100',
    '111111111',
    '001010100',
    '001010100',
    '000000000',
    '000000000',
    '000000000',
  ],
  water: [
    '000010000',
    '000101000',
    '001000100',
    '010000010',
    '010000010',
    '100000001',
    '100000001',
    '010000010',
    '001111100',
  ],
  reading: [
    '010000010',
    '101000101',
    '100101001',
    '100111001',
    '100101001',
    '100101001',
    '100101001',
    '100000001',
    '111111111',
  ],
  praying: [
    '000010000',
    '000111000',
    '001000100',
    '010000010',
    '111111111',
    '100100001',
    '100100001',
    '100110001',
    '111111111',
  ],
  journal: [
    '001111100',
    '011000110',
    '110000110',
    '110101110',
    '110101110',
    '110101110',
    '110000110',
    '011000110',
    '001111100',
  ],
  speaking: [
    '001111100',
    '010000010',
    '100000001',
    '100000001',
    '100000001',
    '100000001',
    '010000010',
    '001110000',
    '000010000',
  ],
  focus: [
    '000010000',
    '001111100',
    '010000010',
    '100110001',
    '101010101',
    '100110001',
    '010000010',
    '001111100',
    '000010000',
  ],
  trophy: [
    '011111110',
    '010000010',
    '110000011',
    '110000011',
    '011111110',
    '000111000',
    '001111100',
    '001111100',
    '001111100',
  ],
  mail: [
    '111111111',
    '100000001',
    '101000101',
    '100101001',
    '100010001',
    '100101001',
    '101000101',
    '100000001',
    '111111111',
  ],
}

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
  pixel = false,
}: {
  kind: GoalMascotKind
  mood: GoalMascotMood
  color?: string
  pixel?: boolean
}) {
  const theme = useTheme()
  const reducedMotion = useReducedMotion()
  const pixelRows = pixel ? PIXEL_GLYPHS[kind] : undefined
  const motionStyle: CSSStyle<ViewStyle> = {
    animationName: !reducedMotion && mood === 'happy' ? CELEBRATE : 'none',
    animationDuration: 300,
    animationIterationCount: 1,
    animationTimingFunction: 'ease-in-out',
  }

  return (
    <Animated.View
      testID={`goal-mascot-${kind}-${mood}`}
      style={[styles.frame, pixel && styles.pixelFrame, motionStyle]}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width="100%"
        height="100%"
        viewBox={pixelRows ? '0 0 9 9' : '0 0 24 24'}
        focusable={false}
      >
        {pixelRows ? (
          pixelRows.flatMap((row, y) =>
            [...row].flatMap((dot, x) =>
              dot === '1' ? (
                <Rect
                  key={`${x}-${y}`}
                  x={x + 0.12}
                  y={y + 0.12}
                  width={0.76}
                  height={0.76}
                  rx={0.14}
                  fill={color ?? theme.text}
                />
              ) : (
                []
              ),
            ),
          )
        ) : (
          <Path
            d={ICONS[kind]}
            fill="none"
            stroke={color ?? theme.text}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
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
  pixelFrame: {
    width: '62%',
    maxWidth: 68,
  },
})
