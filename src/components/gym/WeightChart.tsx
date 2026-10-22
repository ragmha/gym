import { useState } from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import type { WeightBar, WeightRange } from '@/lib/weightTrend'

const CHART_HEIGHT = 220
const AXIS_HEIGHT = 20
const CHIP_HEIGHT = 22
const LABEL_WIDTH = 40
const RANGE_LABEL: Record<WeightRange, string> = {
  '2W': 'past 2 weeks',
  '3M': 'weekly averages, past 3 months',
  '6M': 'weekly averages, past 6 months',
}

const kg = (value: number) => `${value.toFixed(1)} kg`

/** Day numbers for 2W; month names where a new month starts for 3M/6M. */
function axisLabels(bars: WeightBar[], range: WeightRange) {
  return bars.flatMap((bar, index) => {
    if (range === '2W') {
      return (bars.length - 1 - index) % 2 === 0
        ? [{ index, text: String(bar.end.getDate()) }]
        : []
    }
    return index > 0 && bars[index - 1].end.getMonth() !== bar.end.getMonth()
      ? [
          {
            index,
            text: bar.end.toLocaleDateString(undefined, { month: 'short' }),
          },
        ]
      : []
  })
}

/** Warm trend bars fading into the page, the latest highlighted, over a dashed goal line. */
export function WeightChart({
  bars,
  range,
  goalKg,
}: {
  bars: WeightBar[]
  range: WeightRange
  goalKg: number | null
}) {
  const theme = useTheme()
  const { fontScale } = useWindowDimensions()
  const [width, setWidth] = useState(0)
  // Text rows grow with Dynamic Type; the plot keeps its height.
  const axisHeight = AXIS_HEIGHT * fontScale
  const chipHeight = CHIP_HEIGHT * fontScale
  const height = CHART_HEIGHT + axisHeight
  const values = bars.flatMap((bar) =>
    bar.kilograms === null ? [] : [bar.kilograms],
  )
  if (values.length === 0) {
    return (
      <View testID="weight-chart-empty" style={[styles.empty, { height }]}>
        <Text style={[styles.mono, { color: theme.subtitleText }]}>
          No morning weigh-ins in this range
        </Text>
      </View>
    )
  }

  const scale = goalKg === null ? values : [...values, goalKg]
  const low = Math.min(...scale)
  const high = Math.max(...scale)
  const span = Math.max(high - low, 2)
  // Bars rise from well below the lowest value so none sink into the fade.
  const bottom = low - span * 0.8
  const top = high + span * 0.1
  const y = (kilograms: number) =>
    (CHART_HEIGHT * (top - kilograms)) / (top - bottom)
  const slot = width / bars.length
  const barWidth = Math.max(slot - Math.min(slot * 0.3, 8), 2)
  const radius = Math.min(barWidth / 2, 6)
  const latest = bars.map((bar) => bar.kilograms !== null).lastIndexOf(true)
  const label = `Morning weight, ${RANGE_LABEL[range]}: ${kg(values[0])} to ${kg(
    values[values.length - 1],
  )}, lowest ${kg(Math.min(...values))}, highest ${kg(Math.max(...values))}${
    goalKg === null ? '' : `. Goal ${goalKg} kg`
  }`

  return (
    <View
      testID="weight-chart"
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={[styles.chart, { height }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <>
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient
                id="weight-bars"
                x1={0}
                y1={0}
                x2={width}
                y2={0}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0" stopColor={theme.weightBarStart} />
                <Stop offset="1" stopColor={theme.weightBarEnd} />
              </LinearGradient>
              <LinearGradient id="weight-fade" x1="0" y1="0" x2="0" y2="1">
                <Stop
                  offset="0"
                  stopColor={theme.homeBackground}
                  stopOpacity={0}
                />
                <Stop
                  offset="1"
                  stopColor={theme.homeBackground}
                  stopOpacity={0.9}
                />
              </LinearGradient>
            </Defs>
            <Rect
              x={latest * slot + (slot - barWidth) / 2}
              y={0}
              width={barWidth}
              height={CHART_HEIGHT}
              rx={radius}
              fill={theme.text}
              opacity={0.08}
            />
            {bars.map((bar, index) =>
              bar.kilograms === null ? null : (
                <Rect
                  key={index}
                  x={index * slot + (slot - barWidth) / 2}
                  y={y(bar.kilograms)}
                  width={barWidth}
                  height={CHART_HEIGHT - y(bar.kilograms)}
                  rx={radius}
                  fill={index === latest ? theme.text : 'url(#weight-bars)'}
                />
              ),
            )}
            <Rect
              x={0}
              y={CHART_HEIGHT * 0.55}
              width={width}
              height={CHART_HEIGHT * 0.45}
              fill="url(#weight-fade)"
            />
            {goalKg !== null && (
              <Line
                x1={0}
                x2={width}
                y1={y(goalKg)}
                y2={y(goalKg)}
                stroke={theme.text}
                strokeOpacity={0.6}
                strokeWidth={1.5}
                strokeDasharray="5 6"
              />
            )}
          </Svg>
          {goalKg !== null && (
            <View
              testID="weight-goal-chip"
              style={[
                styles.goalChip,
                {
                  // Centred on the goal line, but never outside the plot.
                  top: Math.min(
                    Math.max(y(goalKg) - chipHeight / 2, 0),
                    CHART_HEIGHT - chipHeight,
                  ),
                  height: chipHeight,
                  backgroundColor: theme.text,
                },
              ]}
            >
              <Text style={[styles.mono, { color: theme.homeBackground }]}>
                Goal {goalKg}
              </Text>
            </View>
          )}
          <View style={{ height: axisHeight }}>
            {axisLabels(bars, range).map(({ index, text }) => (
              <Text
                key={index}
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[
                  styles.mono,
                  styles.axisLabel,
                  {
                    color: theme.subtitleText,
                    left: Math.min(
                      Math.max(index * slot + slot / 2 - LABEL_WIDTH / 2, 0),
                      width - LABEL_WIDTH,
                    ),
                  },
                ]}
              >
                {text}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  chart: { alignSelf: 'stretch' },
  empty: {
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalChip: {
    position: 'absolute',
    left: 0,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.pill,
  },
  axisLabel: {
    position: 'absolute',
    bottom: 0,
    width: LABEL_WIDTH,
    textAlign: 'center',
  },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
})
