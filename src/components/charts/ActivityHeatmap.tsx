import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'

import { Elevation, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'

const WEEKS = 15
const DAYS_IN_WEEK = 7
const LABEL_WIDTH = 28
const GAP = 3
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

interface ActivityHeatmapProps {
  title?: string
}

/** Map the combined activity score to a relative intensity level 0-4. */
function toLevel(steps: number | undefined): number {
  if (!steps || steps < 500) return 0
  if (steps < 3_000) return 1
  if (steps < 7_000) return 2
  if (steps < 10_000) return 3
  return 4
}

/**
 * Grid of dates: WEEKS columns (oldest → newest), 7 rows (Sun → Sat).
 */
function buildGrid(today: Date): (Date | null)[][] {
  const rows: (Date | null)[][] = Array.from({ length: DAYS_IN_WEEK }, () =>
    Array.from({ length: WEEKS }, () => null),
  )
  const todayDow = today.getDay()
  const totalDays = (WEEKS - 1) * 7 + todayDow

  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - (totalDays - i))
    const week = Math.floor(i / 7)
    if (week < WEEKS) rows[d.getDay()][week] = d
  }
  return rows
}

/** Derive month labels positioned above the correct week columns. */
function buildMonthHeaders(
  grid: (Date | null)[][],
): { label: string; col: number }[] {
  const headers: { label: string; col: number }[] = []
  let lastMonth = -1

  for (let col = 0; col < WEEKS; col++) {
    // find first non-null date in this column
    for (let row = 0; row < DAYS_IN_WEEK; row++) {
      const d = grid[row][col]
      if (d) {
        const m = d.getMonth()
        if (m !== lastMonth) {
          headers.push({ label: MONTH_LABELS[m], col })
          lastMonth = m
        }
        break
      }
    }
  }
  return headers
}

export function ActivityHeatmap({ title = 'Activity' }: ActivityHeatmapProps) {
  const [containerWidth, setContainerWidth] = useState(0)
  const { fontScale } = useWindowDimensions()
  const theme = useTheme()
  const {
    text: textColor,
    subtitleText: subtitleColor,
    cardBackground: cardBg,
  } = theme
  const intensityColors = useMemo(
    () => [
      theme.heatmapLow,
      theme.heatmapMid,
      theme.heatmapHigh,
      theme.heatmapPeak,
    ],
    [theme],
  )
  const chartWidth =
    fontScale > 1.3 ? Math.max(containerWidth, 360 * fontScale) : containerWidth
  const labelWidth = LABEL_WIDTH * fontScale

  const [intensity, setIntensity] = useState<Map<string, number>>(new Map())

  const today = useMemo(() => new Date(), [])
  const grid = useMemo(() => buildGrid(today), [today])
  const months = useMemo(() => buildMonthHeaders(grid), [grid])

  const cellSize = useMemo(() => {
    const available = chartWidth - 32 - labelWidth - GAP * (WEEKS - 1)
    return Math.max(Math.floor(available / WEEKS), 1)
  }, [chartWidth, labelWidth])

  const emptyColor = theme.cardSurface

  useEffect(() => {
    ;(async () => {
      try {
        setIntensity(await healthSnapshot.getRangeIntensity(WEEKS * 7))
      } catch {
        setIntensity(new Map())
      }
    })()
  }, [])

  const getColor = useCallback(
    (date: Date | null): string => {
      if (!date) return 'transparent'
      const level = toLevel(intensity.get(localDateKey(date)))
      return level === 0 ? emptyColor : intensityColors[level - 1]
    },
    [intensity, emptyColor, intensityColors],
  )

  return (
    <View
      testID="activity-heatmap"
      onLayout={({ nativeEvent }) =>
        setContainerWidth(nativeEvent.layout.width)
      }
      style={[styles.container, { backgroundColor: cardBg }]}
    >
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: textColor }]}
      >
        {title}
      </Text>
      <Text style={[styles.description, { color: subtitleColor }]}>
        Relative activity over the last 15 weeks
      </Text>

      <ScrollView
        testID="activity-heatmap-scroll"
        horizontal
        showsHorizontalScrollIndicator={fontScale > 1.3}
      >
        <View style={{ width: Math.max(chartWidth - 32, 0) }}>
          <View
            style={[
              styles.monthRow,
              { marginLeft: labelWidth, height: 24 * fontScale },
            ]}
          >
            {months.map(({ label, col }, i) => (
              <Text
                key={`m-${i}`}
                style={[
                  styles.monthLabel,
                  {
                    color: subtitleColor,
                    left: col * (cellSize + GAP),
                  },
                ]}
              >
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {/* Day-of-week labels — only Mon, Wed, Fri */}
            <View style={[styles.labels, { width: labelWidth }]}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => (
                <Text
                  key={`lbl-${i}`}
                  allowFontScaling={false}
                  style={[
                    styles.dayLabel,
                    {
                      height: cellSize,
                      lineHeight: cellSize,
                      fontSize: 11 * fontScale,
                      color: subtitleColor,
                    },
                  ]}
                >
                  {i === 1 || i === 3 || i === 5 ? label : ''}
                </Text>
              ))}
            </View>

            {/* Cells */}
            <View style={styles.cells}>
              {grid.map((row, rowIdx) => (
                <View
                  key={`r-${rowIdx}`}
                  testID={`activity-heatmap-row-${rowIdx}`}
                  style={styles.row}
                >
                  {row.map((cell, colIdx) => (
                    <View
                      key={`c-${rowIdx}-${colIdx}`}
                      accessible={cell !== null}
                      accessibilityLabel={
                        cell
                          ? `${cell.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}: ${
                              intensity.has(localDateKey(cell))
                                ? `Relative activity level ${toLevel(intensity.get(localDateKey(cell)))} of 4`
                                : 'No activity reading available'
                            }`
                          : undefined
                      }
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: cellSize * 0.2,
                        backgroundColor: getColor(cell),
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={[styles.legendText, { color: subtitleColor }]}>
              Less
            </Text>
            <View
              style={[styles.legendCell, { backgroundColor: emptyColor }]}
            />
            {intensityColors.map((c) => (
              <View
                key={c}
                style={[styles.legendCell, { backgroundColor: c }]}
              />
            ))}
            <Text style={[styles.legendText, { color: subtitleColor }]}>
              More
            </Text>
          </View>
        </View>
      </ScrollView>
      <Text style={[styles.note, { color: subtitleColor }]}>
        Based on available step and workout readings.
      </Text>
      <Text style={[styles.note, { color: subtitleColor }]}>
        Blank squares include days with no reading.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...Elevation.soft,
    borderRadius: Radii.panel,
    borderCurve: 'continuous',
    padding: 16,
    overflow: 'hidden',
  },
  title: {
    ...Typography.headingMd,
    marginBottom: Spacing.xxs,
  },
  description: { ...Typography.bodySm, marginBottom: Spacing.md },
  note: { ...Typography.bodySm, marginTop: Spacing.sm },
  monthRow: {
    height: 18,
    position: 'relative',
    marginBottom: 2,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
  },
  labels: {
    gap: GAP,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  cells: {
    flex: 1,
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 10,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '500',
  },
})
