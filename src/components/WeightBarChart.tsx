import {
  DashPathEffect,
  LinearGradient,
  Line as SkiaLine,
  Text as SkiaText,
  useFont,
  vec,
} from '@shopify/react-native-skia'
import React, { useCallback, useMemo, useRef } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { Bar, CartesianChart, Line } from 'victory-native'

import type { WeightEntry } from '@/stores/WeightStore'

// ── Constants ───────────────────────────────────────────────────────

const KG_TO_LBS = 2.20462
const BAR_COLORS_PAST = ['#FFB800', '#FF8C00', '#FF5500'] as const
const BAR_COLOR_FUTURE = '#2A2A2A'
const BAR_WIDTH = 18 // pixels per bar slot
const LINE_POINT_WIDTH = 14 // pixels per point in line mode
const LINE_COLOR = '#FFFFFF'

const GOAL_LINE_COLOR = '#FFB800'

// ── Helpers ─────────────────────────────────────────────────────────

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Types ───────────────────────────────────────────────────────────

interface ChartDatum {
  [key: string]: unknown
  index: number
  weight: number
  isFuture: boolean
  isToday: boolean
  dateLabel: string
}

export type ChartMode = 'bar' | 'line'

interface WeightBarChartProps {
  entries: WeightEntry[]
  goalKg: number | null
  unit: 'kg' | 'lbs'
  height?: number
  mode?: ChartMode
}

// ── Component ───────────────────────────────────────────────────────

export function WeightBarChart({
  entries,
  goalKg,
  unit,
  height = 220,
  mode = 'bar',
}: WeightBarChartProps) {
  const font = useFont(require('../assets/fonts/SpaceMono-Regular.ttf'), 10)

  const { chartData, lineData, goalValue, yDomain } = useMemo(() => {
    const today = getTodayStr()
    const totalDays = 37 // ~5 weeks: 30 past + 7 future
    const pastDays = 30

    // Build date slots (for bar mode)
    const todayDate = new Date()
    const slots: { date: string; isFuture: boolean; isToday: boolean }[] = []
    for (let i = pastDays - 1; i >= 0; i--) {
      const d = new Date(todayDate)
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      slots.push({ date: ds, isFuture: false, isToday: ds === today })
    }
    for (let i = 1; i <= totalDays - pastDays; i++) {
      const d = new Date(todayDate)
      d.setDate(d.getDate() + i)
      const ds = d.toISOString().slice(0, 10)
      slots.push({ date: ds, isFuture: true, isToday: false })
    }

    // Map entries by date
    const entryMap = new Map(entries.map((e) => [e.date, e]))

    // Build bar chart data (all day slots, zeros for missing)
    const barData: ChartDatum[] = slots.map((slot, i) => {
      const entry = entryMap.get(slot.date)
      const rawWeight = entry?.weightKg ?? 0
      const weight =
        rawWeight > 0 ? (unit === 'lbs' ? rawWeight * KG_TO_LBS : rawWeight) : 0
      return {
        index: i,
        weight,
        isFuture: slot.isFuture,
        isToday: slot.isToday,
        dateLabel: formatDateShort(slot.date),
      }
    })

    // Build line chart data (only actual entries, no zeros)
    const lineEntries: ChartDatum[] = entries
      .filter((e) => e.weightKg > 0)
      .map((e, i) => ({
        index: i,
        weight: unit === 'lbs' ? e.weightKg * KG_TO_LBS : e.weightKg,
        isFuture: false,
        isToday: e.date === today,
        dateLabel: formatDateShort(e.date),
      }))

    // Goal in display unit
    const gv =
      goalKg !== null ? (unit === 'lbs' ? goalKg * KG_TO_LBS : goalKg) : null

    // Y domain — from actual weights only
    const weights = entries
      .filter((e) => e.weightKg > 0)
      .map((e) => (unit === 'lbs' ? e.weightKg * KG_TO_LBS : e.weightKg))
    const allValues = gv !== null ? [...weights, gv] : weights
    const minVal = allValues.length > 0 ? Math.min(...allValues) : 0
    const maxVal = allValues.length > 0 ? Math.max(...allValues) : 100
    const padding = (maxVal - minVal) * 0.15 || 5
    const domain: [number, number] = [
      Math.max(0, minVal - padding),
      maxVal + padding,
    ]

    return {
      chartData: barData,
      lineData: lineEntries,
      goalValue: gv,
      yDomain: domain,
    }
  }, [entries, goalKg, unit])

  // Chart width based on number of days — wider than screen so it scrolls
  const pointWidth = mode === 'line' ? LINE_POINT_WIDTH : BAR_WIDTH
  const chartWidth = chartData.length * pointWidth

  // Auto-scroll to today on layout
  const scrollRef = useRef<ScrollView>(null)
  const todayIndex = chartData.findIndex((d) => d.isToday)
  const handleLayout = useCallback(() => {
    if (todayIndex >= 0 && scrollRef.current) {
      const offset = Math.max(0, todayIndex * pointWidth - 160)
      scrollRef.current.scrollTo({ x: offset, animated: false })
    }
  }, [todayIndex, pointWidth])

  if (entries.length < 2) {
    return (
      <View style={[styles.placeholder, { height }]}>
        <Text style={styles.placeholderText}>
          Log at least 2 entries to see the chart
        </Text>
      </View>
    )
  }

  // Find x-axis label positions
  const firstLabel = chartData[0]?.dateLabel ?? ''
  const todayItem = chartData.find((d) => d.isToday)
  const todayLabel = todayItem?.dateLabel ?? ''
  const lastLabel = chartData[chartData.length - 1]?.dateLabel ?? ''

  // Line mode x-axis labels
  const lineFirstLabel = lineData[0]?.dateLabel ?? ''
  const lineLastLabel = lineData[lineData.length - 1]?.dateLabel ?? ''

  // ── Line mode: fits to screen, only actual data points ────────
  if (mode === 'line') {
    if (lineData.length < 2) {
      return (
        <View style={[styles.placeholder, { height }]}>
          <Text style={styles.placeholderText}>
            Log at least 2 entries to see the chart
          </Text>
        </View>
      )
    }

    return (
      <View style={{ height }}>
        <View style={{ height: height - 24 }}>
          <CartesianChart
            data={lineData}
            xKey="index"
            yKeys={['weight']}
            domain={{ y: yDomain }}
            domainPadding={{ left: 20, right: 20, top: 16 }}
            padding={{ left: 0, right: 0, bottom: 0, top: 0 }}
          >
            {({ points, chartBounds }) => (
              <>
                <Line
                  points={points.weight}
                  color={LINE_COLOR}
                  strokeWidth={2.5}
                  curveType="natural"
                  connectMissingData
                  animate={{ type: 'timing', duration: 600 }}
                />

                {/* Goal line */}
                {goalValue !== null && font && (
                  <>
                    {(() => {
                      const yRange = yDomain[1] - yDomain[0]
                      const chartHeight = chartBounds.bottom - chartBounds.top
                      const goalY =
                        chartBounds.bottom -
                        ((goalValue - yDomain[0]) / yRange) * chartHeight

                      return (
                        <>
                          <SkiaLine
                            p1={vec(chartBounds.left, goalY)}
                            p2={vec(chartBounds.right, goalY)}
                            color={GOAL_LINE_COLOR}
                            strokeWidth={1}
                          >
                            <DashPathEffect intervals={[6, 4]} />
                          </SkiaLine>
                          <SkiaText
                            x={chartBounds.right - 70}
                            y={goalY - 6}
                            text={`Goal: ${goalValue.toFixed(0)}`}
                            font={font}
                            color={GOAL_LINE_COLOR}
                          />
                        </>
                      )
                    })()}
                  </>
                )}
              </>
            )}
          </CartesianChart>
        </View>

        {/* X-axis labels */}
        <View style={styles.xLabels}>
          <Text style={styles.xLabel}>{lineFirstLabel}</Text>
          <Text style={[styles.xLabel, styles.xLabelToday]}>
            {lineLastLabel}
          </Text>
        </View>
      </View>
    )
  }

  // ── Bar mode: scrollable day-by-day ───────────────────────────
  return (
    <View style={{ height }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onLayout={handleLayout}
        contentContainerStyle={{ width: chartWidth }}
      >
        <View style={{ width: chartWidth, height: height - 24 }}>
          <CartesianChart
            data={chartData}
            xKey="index"
            yKeys={['weight']}
            domain={{ y: yDomain }}
            domainPadding={{ left: 10, right: 10, top: 16 }}
            padding={{ left: 0, right: 0, bottom: 0, top: 0 }}
          >
            {({ points, chartBounds }) => (
              <>
                {/* Bar mode */}
                {mode === 'bar' &&
                  points.weight.map(
                    (point: (typeof points.weight)[number], index: number) => {
                      const datum = chartData[index]
                      if (!datum || datum.weight === 0) return null

                      return (
                        <Bar
                          key={index}
                          barCount={points.weight.length}
                          points={[point]}
                          chartBounds={chartBounds}
                          innerPadding={0.15}
                          roundedCorners={{ topLeft: 3, topRight: 3 }}
                          animate={{ type: 'timing', duration: 600 }}
                        >
                          {datum.isFuture ? (
                            <LinearGradient
                              start={vec(0, chartBounds.top)}
                              end={vec(0, chartBounds.bottom)}
                              colors={[BAR_COLOR_FUTURE, BAR_COLOR_FUTURE]}
                            />
                          ) : (
                            <LinearGradient
                              start={vec(0, chartBounds.top)}
                              end={vec(0, chartBounds.bottom)}
                              colors={[BAR_COLORS_PAST[0], BAR_COLORS_PAST[2]]}
                            />
                          )}
                        </Bar>
                      )
                    },
                  )}

                {/* Goal line */}
                {goalValue !== null && font && (
                  <>
                    {(() => {
                      const yRange = yDomain[1] - yDomain[0]
                      const chartHeight = chartBounds.bottom - chartBounds.top
                      const goalY =
                        chartBounds.bottom -
                        ((goalValue - yDomain[0]) / yRange) * chartHeight

                      return (
                        <>
                          <SkiaLine
                            p1={vec(chartBounds.left, goalY)}
                            p2={vec(chartBounds.right, goalY)}
                            color={GOAL_LINE_COLOR}
                            strokeWidth={1}
                          >
                            <DashPathEffect intervals={[6, 4]} />
                          </SkiaLine>
                          <SkiaText
                            x={
                              chartBounds.left +
                              (chartBounds.right - chartBounds.left) / 2 -
                              30
                            }
                            y={goalY - 6}
                            text={`Goal: ${goalValue.toFixed(0)}`}
                            font={font}
                            color={GOAL_LINE_COLOR}
                          />
                        </>
                      )
                    })()}
                  </>
                )}
              </>
            )}
          </CartesianChart>
        </View>
      </ScrollView>

      {/* X-axis labels */}
      <View style={styles.xLabels}>
        <Text style={styles.xLabel}>{firstLabel}</Text>
        <Text style={[styles.xLabel, styles.xLabelToday]}>{todayLabel}</Text>
        <Text style={styles.xLabel}>{lastLabel}</Text>
      </View>
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: 14,
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  xLabel: {
    color: '#666',
    fontSize: 11,
  },
  xLabelToday: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
})
