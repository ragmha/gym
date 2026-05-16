import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/hooks/useThemeColor'
import type { ReadinessMetric, ReadinessSummary } from '@/hooks/useReadiness'

interface ReadinessStripProps {
  readiness: ReadinessSummary
}

interface MetricCellProps {
  label: string
  metric: ReadinessMetric
  unit: string
  format: (value: number) => string
}

function deltaColor(direction: ReadinessMetric['direction']): string {
  if (direction === 'good') return '#22C55E'
  if (direction === 'bad') return '#EF4444'
  return '#94A3B8'
}

function MetricCell({ label, metric, unit, format }: MetricCellProps) {
  const theme = useTheme()
  const showDelta = metric.delta != null && metric.direction !== 'neutral'
  const deltaArrow =
    metric.delta == null
      ? null
      : metric.delta > 0
        ? 'arrow-up'
        : metric.delta < 0
          ? 'arrow-down'
          : 'remove'

  return (
    <View style={[styles.cell, { backgroundColor: theme.cardElevated }]}>
      <Text style={[styles.cellLabel, { color: theme.subtitleText }]}>
        {label}
      </Text>
      <Text style={[styles.cellValue, { color: theme.text }]}>
        {metric.value == null ? '--' : format(metric.value)}
        <Text style={[styles.cellUnit, { color: theme.subtitleText }]}>
          {' '}
          {unit}
        </Text>
      </Text>
      {showDelta && metric.delta != null && deltaArrow ? (
        <View style={styles.deltaRow}>
          <Ionicons
            name={deltaArrow}
            size={12}
            color={deltaColor(metric.direction)}
          />
          <Text
            style={[styles.deltaText, { color: deltaColor(metric.direction) }]}
          >
            {format(Math.abs(metric.delta))} {unit}
          </Text>
        </View>
      ) : (
        <Text style={[styles.deltaPlaceholder, { color: theme.subtitleText }]}>
          baseline {metric.baseline == null ? '--' : format(metric.baseline)}
        </Text>
      )}
    </View>
  )
}

const formatInt = (v: number) => String(Math.round(v))
const formatHours = (v: number) => v.toFixed(1)

export function ReadinessStrip({ readiness }: ReadinessStripProps) {
  return (
    <View style={styles.container}>
      <MetricCell
        label="HRV"
        metric={readiness.hrv}
        unit="ms"
        format={formatInt}
      />
      <MetricCell
        label="Resting HR"
        metric={readiness.restingHeartRate}
        unit="bpm"
        format={formatInt}
      />
      <MetricCell
        label="Sleep"
        metric={readiness.sleepHours}
        unit="h"
        format={formatHours}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  cell: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    gap: 4,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cellValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cellUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deltaPlaceholder: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
})
