import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/hooks/useThemeColor'
import type { ACWR, DailyBar } from '@/lib/training/load'
import { PILLAR_META } from '@/lib/training/pillars'

interface LoadChartProps {
  dailyBars: readonly DailyBar[]
  acwr: ACWR
}

function acwrStatusColor(status: ACWR['status']): string {
  if (status === 'optimal') return '#22C55E'
  if (status === 'high') return '#EF4444'
  if (status === 'low') return '#F59E0B'
  return '#94A3B8'
}

function acwrStatusLabel(status: ACWR['status']): string {
  if (status === 'optimal') return 'Optimal'
  if (status === 'high') return 'High'
  if (status === 'low') return 'Low'
  return 'Calibrating'
}

const CHART_HEIGHT = 100

export function LoadChart({ dailyBars, acwr }: LoadChartProps) {
  const theme = useTheme()
  const maxMinutes = useMemo(
    () =>
      dailyBars.reduce(
        (max, b) => Math.max(max, b.strength + b.run + b.conditioning),
        60, // floor so empty windows don't render uselessly tall bars
      ),
    [dailyBars],
  )
  const statusColor = acwrStatusColor(acwr.status)

  return (
    <View style={[styles.container, { backgroundColor: theme.cardElevated }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: theme.text }]}>
            14-day training load
          </Text>
          <Text style={[styles.subtitle, { color: theme.subtitleText }]}>
            ACWR · duration only
          </Text>
        </View>
        <View
          style={[styles.acwrPill, { backgroundColor: `${statusColor}22` }]}
        >
          <Text style={[styles.acwrValue, { color: statusColor }]}>
            {acwr.value == null ? '—' : acwr.value.toFixed(2)}
          </Text>
          <Text style={[styles.acwrStatus, { color: statusColor }]}>
            {acwrStatusLabel(acwr.status)}
          </Text>
        </View>
      </View>

      <View style={styles.chartRow}>
        {dailyBars.map((bar) => {
          const total = bar.strength + bar.run + bar.conditioning
          const heightPct = total / maxMinutes
          const strengthPct = total === 0 ? 0 : bar.strength / total
          const runPct = total === 0 ? 0 : bar.run / total
          const condPct = total === 0 ? 0 : bar.conditioning / total
          return (
            <View key={bar.dateISO} style={styles.barCol}>
              <View style={[styles.barTrack, { height: CHART_HEIGHT }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: heightPct * CHART_HEIGHT,
                      backgroundColor: theme.background,
                    },
                  ]}
                >
                  {strengthPct > 0 ? (
                    <View
                      style={{
                        flex: strengthPct,
                        backgroundColor: PILLAR_META.strength.accent,
                      }}
                    />
                  ) : null}
                  {runPct > 0 ? (
                    <View
                      style={{
                        flex: runPct,
                        backgroundColor: PILLAR_META.run.accent,
                      }}
                    />
                  ) : null}
                  {condPct > 0 ? (
                    <View
                      style={{
                        flex: condPct,
                        backgroundColor: PILLAR_META.conditioning.accent,
                      }}
                    />
                  ) : null}
                </View>
              </View>
            </View>
          )
        })}
      </View>

      <View style={styles.legendRow}>
        <LegendDot
          color={PILLAR_META.strength.accent}
          label="Strength"
          theme={theme}
        />
        <LegendDot color={PILLAR_META.run.accent} label="Run" theme={theme} />
        <LegendDot
          color={PILLAR_META.conditioning.accent}
          label="Conditioning"
          theme={theme}
        />
      </View>
    </View>
  )
}

function LegendDot({
  color,
  label,
  theme,
}: {
  color: string
  label: string
  theme: ReturnType<typeof useTheme>
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: theme.subtitleText }]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 18,
    padding: 16,
    borderRadius: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  acwrPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  acwrValue: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  acwrStatus: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: 4,
  },
  barCol: {
    flex: 1,
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  barTrack: {
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 14,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
})
