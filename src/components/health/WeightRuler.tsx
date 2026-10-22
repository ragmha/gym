import { memo, useEffect, useRef, useState } from 'react'
import {
  FlatList,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { WEIGHT_MAX_KG, WEIGHT_MIN_KG } from '@/lib/weightTrend'

// 10 px per 0.1 kg; each list item is one kilogram.
const TICK = 10
const KG_WIDTH = TICK * 10
const HEIGHT = 76
const KILOGRAMS = Array.from(
  { length: WEIGHT_MAX_KG - WEIGHT_MIN_KG + 1 },
  (_, index) => WEIGHT_MIN_KG + index,
)
const LAST = KILOGRAMS.length - 1

const offsetOf = (kilograms: number) => (kilograms - WEIGHT_MIN_KG) * KG_WIDTH

/** Snaps to the ruler's 0.1 kg steps within its 20–300 kg range. */
export const rulerKilograms = (kilograms: number) =>
  Math.min(
    Math.max(Math.round(kilograms * 10) / 10, WEIGHT_MIN_KG),
    WEIGHT_MAX_KG,
  )

const itemLayout = (_: unknown, index: number) => ({
  // The maximum is a lone tick, so the ruler cannot scroll past it.
  length: index === LAST ? 0 : KG_WIDTH,
  offset: KG_WIDTH * index,
  index,
})

const Kilogram = memo(function Kilogram({
  kilograms,
  major,
  minor,
  height,
}: {
  kilograms: number
  major: string
  minor: string
  height: number
}) {
  const ticks = kilograms === WEIGHT_MAX_KG ? 1 : 10
  return (
    <View style={{ width: ticks === 1 ? 0 : KG_WIDTH, height }}>
      {Array.from({ length: ticks }, (_, tick) => (
        <View
          key={tick}
          style={[
            styles.tick,
            {
              left: tick * TICK - 1,
              height: tick === 0 ? 30 : tick === 5 ? 20 : 12,
              backgroundColor: tick === 0 ? major : minor,
            },
          ]}
        />
      ))}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[styles.label, { color: minor }]}
      >
        {kilograms}
      </Text>
    </View>
  )
})

/** Drag or VoiceOver-adjust in 0.1 kg steps; follows typed values without echoing them back. */
export function WeightRuler({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (kilograms: number) => void
  disabled: boolean
}) {
  const theme = useTheme()
  const { fontScale } = useWindowDimensions()
  // Room for kilogram labels that grow with Dynamic Type.
  const height = HEIGHT + styles.label.lineHeight * (fontScale - 1)
  const [width, setWidth] = useState(0)
  const [start] = useState(value)
  const listRef = useRef<FlatList<number>>(null)
  const placed = useRef(value)
  const dragging = useRef(false)
  const momentum = useRef(false)

  useEffect(() => {
    if (width === 0 || value === placed.current) return
    if (dragging.current || momentum.current) return
    placed.current = value
    listRef.current?.scrollToOffset({
      offset: offsetOf(value),
      animated: false,
    })
  }, [value, width])

  const follow = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = rulerKilograms(
      WEIGHT_MIN_KG + nativeEvent.contentOffset.x / KG_WIDTH,
    )
    if (next === placed.current) return
    placed.current = next
    onChange(next)
  }

  return (
    <View
      testID="weight-ruler"
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Weight ruler"
      accessibilityValue={{ text: `${value.toFixed(1)} kilograms` }}
      accessibilityState={{ disabled }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (disabled) return
        const step =
          nativeEvent.actionName === 'increment'
            ? 0.1
            : nativeEvent.actionName === 'decrement'
              ? -0.1
              : 0
        if (step !== 0) onChange(rulerKilograms(value + step))
      }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.ruler, { height }]}
    >
      {width > 0 && (
        <>
          <FlatList
            ref={listRef}
            testID="weight-ruler-list"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            horizontal
            data={KILOGRAMS}
            extraData={theme}
            keyExtractor={String}
            renderItem={({ item }) => (
              <Kilogram
                kilograms={item}
                major={theme.text}
                minor={theme.subtitleText}
                height={height}
              />
            )}
            getItemLayout={itemLayout}
            // Start the render window at the left edge so the opening view is filled.
            initialScrollIndex={Math.max(
              Math.floor(start - width / 2 / KG_WIDTH) - WEIGHT_MIN_KG,
              0,
            )}
            initialNumToRender={Math.ceil(width / KG_WIDTH) + 2}
            windowSize={7}
            contentOffset={{ x: offsetOf(start), y: 0 }}
            contentContainerStyle={{ paddingHorizontal: width / 2 }}
            showsHorizontalScrollIndicator={false}
            snapToInterval={TICK}
            decelerationRate="fast"
            scrollEnabled={!disabled}
            scrollEventThrottle={16}
            onScroll={(event) => {
              if (dragging.current || momentum.current) follow(event)
            }}
            onScrollBeginDrag={() => {
              dragging.current = true
            }}
            onScrollEndDrag={(event) => {
              dragging.current = false
              follow(event)
            }}
            onMomentumScrollBegin={() => {
              momentum.current = true
            }}
            onMomentumScrollEnd={(event) => {
              if (!momentum.current) return
              momentum.current = false
              follow(event)
            }}
          />
          <View
            style={[
              styles.indicator,
              { left: width / 2 - 2, backgroundColor: theme.weightGoalText },
            ]}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  ruler: { alignSelf: 'stretch' },
  tick: { position: 'absolute', top: 6, width: 2, borderRadius: 1 },
  label: {
    position: 'absolute',
    top: 44,
    left: -(KG_WIDTH - 20) / 2,
    width: KG_WIDTH - 20,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
    fontSize: 12,
    lineHeight: 16,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 4,
    height: 42,
    borderRadius: Radii.pill,
    pointerEvents: 'none',
  },
})
