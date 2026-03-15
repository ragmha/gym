import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'

import { useTheme } from '@/hooks/useThemeColor'
import { getActivityIntensity, isHealthKitAvailable } from '@/lib/healthkit'

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

/** GitHub-style green intensity scale. */
const INTENSITY_COLORS = [
  '#9be9a8', // L1 — light
  '#40c463', // L2
  '#30a14e', // L3
  '#216e39', // L4 — dark
] as const

interface ActivityHeatmapProps {
  title?: string
}

/** Map raw step-count to an intensity level 0-4. */
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

function generateMockIntensity(): Map<string, number> {
  const map = new Map<string, number>()
  const today = new Date()
  for (let i = 0; i < WEEKS * 7; i++) {
    if (Math.random() < 0.45) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      // random step count weighted toward moderate activity
      const steps = Math.round(Math.random() * 14_000)
      map.set(d.toISOString().slice(0, 10), steps)
    }
  }
  return map
}

export function ActivityHeatmap({ title = 'Activity' }: ActivityHeatmapProps) {
  const { width } = useWindowDimensions()
  const {
    text: textColor,
    subtitleText: subtitleColor,
    cardBackground: cardBg,
  } = useTheme()

  const [intensity, setIntensity] = useState<Map<string, number>>(new Map())

  const today = useMemo(() => new Date(), [])
  const grid = useMemo(() => buildGrid(today), [today])
  const months = useMemo(() => buildMonthHeaders(grid), [grid])

  const cellSize = useMemo(() => {
    // 40 = marginHorizontal (20×2), 32 = padding (16×2)
    const available = width - 40 - 32 - LABEL_WIDTH - GAP * (WEEKS - 1)
    return Math.max(Math.floor(available / WEEKS), 4)
  }, [width])

  const emptyColor = `${subtitleColor}15`

  useEffect(() => {
    ;(async () => {
      if (Platform.OS === 'ios' && isHealthKitAvailable()) {
        try {
          setIntensity(await getActivityIntensity(WEEKS * 7))
        } catch {
          setIntensity(generateMockIntensity())
        }
      } else {
        setIntensity(generateMockIntensity())
      }
    })()
  }, [])

  const getColor = useCallback(
    (date: Date | null): string => {
      if (!date) return 'transparent'
      const level = toLevel(intensity.get(date.toISOString().slice(0, 10)))
      return level === 0 ? emptyColor : INTENSITY_COLORS[level - 1]
    },
    [intensity, emptyColor],
  )

  return (
    <View style={[styles.container, { backgroundColor: cardBg }]}>
      <Text style={[styles.title, { color: textColor }]}>
        {title.toUpperCase()}
      </Text>

      {/* Month headers */}
      <View style={[styles.monthRow, { marginLeft: LABEL_WIDTH }]}>
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
        <View style={[styles.labels, { width: LABEL_WIDTH }]}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, i) => (
            <Text
              key={`lbl-${i}`}
              style={[
                styles.dayLabel,
                {
                  height: cellSize,
                  lineHeight: cellSize,
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
            <View key={`r-${rowIdx}`} style={styles.row}>
              {row.map((cell, colIdx) => (
                <View
                  key={`c-${rowIdx}-${colIdx}`}
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
        <Text style={[styles.legendText, { color: subtitleColor }]}>Less</Text>
        <View style={[styles.legendCell, { backgroundColor: emptyColor }]} />
        {INTENSITY_COLORS.map((c) => (
          <View key={c} style={[styles.legendCell, { backgroundColor: c }]} />
        ))}
        <Text style={[styles.legendText, { color: subtitleColor }]}>More</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  monthRow: {
    height: 18,
    position: 'relative',
    marginBottom: 2,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
  },
  labels: {
    gap: GAP,
  },
  dayLabel: {
    fontSize: 10,
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
    fontSize: 10,
    fontWeight: '500',
  },
})
