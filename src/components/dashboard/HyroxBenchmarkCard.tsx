import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useTheme } from '@/hooks/useThemeColor'
import {
  HYROX_STATIONS,
  compareToTarget,
  formatStationTime,
  type BenchmarkStatus,
  type HyroxStation,
  type StationMeta,
} from '@/lib/training/hyrox'
import { useHyroxStationSummary } from '@/stores/HyroxBenchmarkStore'

interface StationRowProps {
  station: StationMeta
  onPress: () => void
}

function statusColor(
  status: BenchmarkStatus | 'unset',
  theme: ReturnType<typeof useTheme>,
): string {
  if (status === 'green') return '#22C55E'
  if (status === 'amber') return '#F59E0B'
  if (status === 'red') return '#EF4444'
  return theme.subtitleText
}

function statusLabel(
  status: BenchmarkStatus | 'unset',
  deltaSeconds: number,
): string {
  if (status === 'unset') return 'Log first'
  if (status === 'green' && deltaSeconds === 0) return 'On target'
  if (status === 'green') return `-${Math.abs(deltaSeconds)}s`
  return `+${Math.abs(deltaSeconds)}s`
}

function StationRow({ station, onPress }: StationRowProps) {
  const theme = useTheme()
  const summary = useHyroxStationSummary(station.id)
  const prSeconds = summary.pr?.timeSeconds ?? null
  const { status, deltaSeconds } = useMemo(() => {
    if (prSeconds == null) {
      return { status: 'unset' as const, deltaSeconds: 0 }
    }
    return {
      status: compareToTarget(station.id, prSeconds),
      deltaSeconds: prSeconds - station.targetSeconds,
    }
  }, [prSeconds, station.id, station.targetSeconds])

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.cardElevated }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.heroSoft }]}>
        <Ionicons
          name={
            station.ioniconName as React.ComponentProps<typeof Ionicons>['name']
          }
          size={18}
          color={theme.hero}
        />
      </View>

      <View style={styles.body}>
        <Text style={[styles.stationName, { color: theme.text }]}>
          {station.short}
        </Text>
        <Text style={[styles.targetLabel, { color: theme.subtitleText }]}>
          Target {formatStationTime(station.targetSeconds)}
        </Text>
      </View>

      <View style={styles.metricCol}>
        <Text style={[styles.prValue, { color: theme.text }]}>
          {prSeconds == null ? '—' : formatStationTime(prSeconds)}
        </Text>
        <Text style={[styles.deltaText, { color: statusColor(status, theme) }]}>
          {statusLabel(status, deltaSeconds)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.subtitleText} />
    </TouchableOpacity>
  )
}

const PRIORITY_STATIONS: readonly HyroxStation[] = [
  'run_1km',
  'ski_erg_1000m',
  'sled_push_50m',
  'sled_pull_50m',
  'burpee_broad_jump_80m',
  'row_1000m',
  'farmers_carry_200m',
  'sandbag_lunges_100m',
  'wall_balls_100',
] as const

export function HyroxBenchmarkCard() {
  const router = useRouter()
  const theme = useTheme()
  const stationsToShow = useMemo(
    () =>
      PRIORITY_STATIONS.map((id) =>
        HYROX_STATIONS.find((s) => s.id === id),
      ).filter((s): s is StationMeta => s !== undefined),
    [],
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          Hyrox stations
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/hyrox-log')}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Text style={[styles.viewAll, { color: theme.hero }]}>Log</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.list}>
        {stationsToShow.map((station) => (
          <StationRow
            key={station.id}
            station={station}
            onPress={() =>
              router.push({
                pathname: '/hyrox-log',
                params: { stationId: station.id },
              })
            }
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
  },
  viewAll: {
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  stationName: {
    fontSize: 14,
    fontWeight: '700',
  },
  targetLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  metricCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  prValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '700',
  },
})
