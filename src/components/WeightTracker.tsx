import React, { useCallback, useState } from 'react'
import {
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Line, Polyline, Circle as SvgCircle } from 'react-native-svg'

import { useTheme } from '@/hooks/useThemeColor'
import { useWeightStore, type WeightEntry } from '@/stores/WeightStore'

// ── Helpers ─────────────────────────────────────────────────────────

const KG_TO_LBS = 2.20462

function formatWeight(kg: number, unit: 'kg' | 'lbs'): string {
  const val = unit === 'lbs' ? kg * KG_TO_LBS : kg
  return `${val.toFixed(1)}`
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Chart constants ─────────────────────────────────────────────────

const CHART_WIDTH = 320
const CHART_HEIGHT = 160
const PADDING_LEFT = 0
const PADDING_RIGHT = 8
const PADDING_TOP = 12
const PADDING_BOTTOM = 24
const PLOT_WIDTH = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT
const PLOT_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM

// ── Mini line chart ─────────────────────────────────────────────────

interface WeightChartProps {
  entries: WeightEntry[]
  unit: 'kg' | 'lbs'
  accentColor: string
  gridColor: string
  textColor: string
}

function WeightChart({
  entries,
  unit,
  accentColor,
  gridColor,
  textColor,
}: WeightChartProps) {
  if (entries.length < 2) {
    return (
      <View style={[styles.chartPlaceholder, { height: CHART_HEIGHT }]}>
        <Text style={[styles.chartPlaceholderText, { color: textColor }]}>
          Log at least 2 entries to see a chart
        </Text>
      </View>
    )
  }

  const weights = entries.map((e) =>
    unit === 'lbs' ? e.weightKg * KG_TO_LBS : e.weightKg,
  )
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1

  const points = entries.map((_, i) => {
    const x = PADDING_LEFT + (i / (entries.length - 1)) * PLOT_WIDTH
    const y =
      PADDING_TOP + PLOT_HEIGHT - ((weights[i] - minW) / range) * PLOT_HEIGHT
    return { x, y }
  })

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ')

  const gridLines = [0, 0.5, 1].map((frac) => {
    const y = PADDING_TOP + PLOT_HEIGHT - frac * PLOT_HEIGHT
    const val = minW + frac * range
    return { y, label: val.toFixed(1) }
  })

  return (
    <Svg
      width={CHART_WIDTH}
      height={CHART_HEIGHT}
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
    >
      {gridLines.map((g) => (
        <Line
          key={g.label}
          x1={PADDING_LEFT}
          y1={g.y}
          x2={CHART_WIDTH - PADDING_RIGHT}
          y2={g.y}
          stroke={gridColor}
          strokeWidth={0.5}
          strokeDasharray="4,4"
        />
      ))}
      <Polyline
        points={polylinePoints}
        fill="none"
        stroke={accentColor}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <SvgCircle
          key={entries[i].date}
          cx={p.x}
          cy={p.y}
          r={3.5}
          fill={accentColor}
        />
      ))}
    </Svg>
  )
}

// ── Main component ──────────────────────────────────────────────────

export function WeightTracker() {
  const { recentEntries, latestEntry, trendDelta, unit, addEntry, setUnit } =
    useWeightStore()

  const {
    cardBackground: cardBg,
    text: textColor,
    icon: subtextColor,
    accent: accentColor,
    border: borderColor,
    separator: gridColor,
  } = useTheme()

  const [inputValue, setInputValue] = useState('')
  const [showInput, setShowInput] = useState(false)

  const handleAddEntry = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    const parsed = parseFloat(trimmed)
    if (Number.isNaN(parsed) || parsed <= 0 || parsed > 500) {
      if (Platform.OS === 'web') {
        alert('Please enter a valid weight.')
      } else {
        Alert.alert('Invalid weight', 'Please enter a valid weight.')
      }
      return
    }

    const kg = unit === 'lbs' ? parsed / KG_TO_LBS : parsed
    await addEntry(kg)
    setInputValue('')
    setShowInput(false)
    Keyboard.dismiss()
  }, [inputValue, unit, addEntry])

  const toggleUnit = useCallback(() => {
    setUnit(unit === 'kg' ? 'lbs' : 'kg')
  }, [unit, setUnit])

  const trendText =
    trendDelta !== null
      ? `${trendDelta > 0 ? '+' : ''}${formatWeight(Math.abs(trendDelta), unit)} ${unit} this week`
      : 'Not enough data for trend'

  const trendColor =
    trendDelta !== null
      ? trendDelta < 0
        ? '#34C759'
        : trendDelta > 0
          ? '#FF3B30'
          : subtextColor
      : subtextColor

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Weight</Text>
        <TouchableOpacity onPress={toggleUnit} hitSlop={8}>
          <Text style={[styles.unitToggle, { color: accentColor }]}>
            {unit.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.currentRow}>
          <View>
            <Text style={[styles.currentWeight, { color: textColor }]}>
              {latestEntry ? formatWeight(latestEntry.weightKg, unit) : '--'}
              <Text style={[styles.unitLabel, { color: subtextColor }]}>
                {' '}
                {unit}
              </Text>
            </Text>
            <Text style={[styles.trend, { color: trendColor }]}>
              {trendText}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { borderColor }]}
            onPress={() => setShowInput((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={[styles.addButtonText, { color: accentColor }]}>
              {showInput ? '✕' : '+ Log'}
            </Text>
          </TouchableOpacity>
        </View>

        {showInput && (
          <View style={[styles.inputRow, { borderTopColor: gridColor }]}>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              placeholder={`Weight (${unit})`}
              placeholderTextColor={subtextColor}
              keyboardType="decimal-pad"
              returnKeyType="done"
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleAddEntry}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: accentColor }]}
              onPress={handleAddEntry}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.chartContainer}>
          <WeightChart
            entries={recentEntries}
            unit={unit}
            accentColor={accentColor}
            gridColor={gridColor}
            textColor={subtextColor}
          />
        </View>

        {recentEntries.length >= 2 && (
          <View style={styles.xLabels}>
            <Text style={[styles.xLabel, { color: subtextColor }]}>
              {formatDateShort(recentEntries[0].date)}
            </Text>
            <Text style={[styles.xLabel, { color: subtextColor }]}>
              {formatDateShort(recentEntries[recentEntries.length - 1].date)}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  unitToggle: {
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  currentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currentWeight: {
    fontSize: 32,
    fontWeight: '800',
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  trend: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  addButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  saveButton: {
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  chartContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  chartPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPlaceholderText: {
    fontSize: 13,
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  xLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
})
