import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/hooks/useThemeColor'
import type { CalibratedTargets, WeeklyVolume } from '@/lib/training/load'
import { PILLAR_META, type Pillar } from '@/lib/training/pillars'

interface PillarTripletProps {
  weekly: readonly WeeklyVolume[]
  targets: CalibratedTargets
}

function pillarTarget(pillar: Pillar, targets: CalibratedTargets): number {
  if (pillar === 'strength') return targets.strengthMinutes
  if (pillar === 'run') return targets.runMinutes
  return targets.conditioningMinutes
}

function deltaIcon(
  vsLastWeek: number,
): React.ComponentProps<typeof Ionicons>['name'] {
  if (vsLastWeek > 0) return 'arrow-up'
  if (vsLastWeek < 0) return 'arrow-down'
  return 'remove'
}

function deltaColor(vsLastWeek: number): string {
  if (vsLastWeek > 0) return '#22C55E'
  if (vsLastWeek < 0) return '#EF4444'
  return '#94A3B8'
}

interface PillarCardProps {
  pillar: WeeklyVolume
  target: number
  calibrating: boolean
}

function PillarCard({ pillar, target, calibrating }: PillarCardProps) {
  const theme = useTheme()
  const meta = PILLAR_META[pillar.pillar]
  const pct = target > 0 ? Math.min(1, pillar.minutes / target) : 0

  return (
    <View style={[styles.card, { backgroundColor: theme.cardElevated }]}>
      <View style={styles.headerRow}>
        <View
          style={[styles.iconWrap, { backgroundColor: `${meta.accent}22` }]}
        >
          <Ionicons
            name={
              meta.ioniconName as React.ComponentProps<typeof Ionicons>['name']
            }
            size={16}
            color={meta.accent}
          />
        </View>
        <Text style={[styles.pillarLabel, { color: theme.text }]}>
          {meta.label}
        </Text>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: theme.text }]}>
          {pillar.minutes}
        </Text>
        <Text style={[styles.unit, { color: theme.subtitleText }]}>
          / {target}m
        </Text>
      </View>

      <View
        style={[styles.progressTrack, { backgroundColor: theme.background }]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${pct * 100}%`,
              backgroundColor: meta.accent,
            },
          ]}
        />
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.sessions, { color: theme.subtitleText }]}>
          {pillar.sessionCount} session{pillar.sessionCount === 1 ? '' : 's'}
        </Text>
        {pillar.vsLastWeekMinutes !== 0 ? (
          <View style={styles.deltaRow}>
            <Ionicons
              name={deltaIcon(pillar.vsLastWeekMinutes)}
              size={11}
              color={deltaColor(pillar.vsLastWeekMinutes)}
            />
            <Text
              style={[
                styles.deltaText,
                { color: deltaColor(pillar.vsLastWeekMinutes) },
              ]}
            >
              {Math.abs(pillar.vsLastWeekMinutes)}m
            </Text>
          </View>
        ) : (
          <Text style={[styles.deltaText, { color: theme.subtitleText }]}>
            —
          </Text>
        )}
      </View>
      {calibrating ? (
        <Text style={[styles.calibrating, { color: theme.subtitleText }]}>
          Calibrating…
        </Text>
      ) : null}
    </View>
  )
}

export function PillarTriplet({ weekly, targets }: PillarTripletProps) {
  const calibrating = targets.source !== 'calibrated'
  return (
    <View style={styles.container}>
      {weekly.map((p) => (
        <PillarCard
          key={p.pillar}
          pillar={p}
          target={pillarTarget(p.pillar, targets)}
          calibrating={calibrating}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 18,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessions: {
    fontSize: 11,
    fontWeight: '600',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  calibrating: {
    fontSize: 10,
    fontWeight: '600',
    fontStyle: 'italic',
  },
})
