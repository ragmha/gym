import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useTheme } from '@/hooks/useThemeColor'

interface WeightCardProps {
  /** Most recent body mass from HealthKit, or null when nothing is recorded. */
  bodyMassKg: number | null
}

/**
 * Read-only view of the latest HealthKit weigh-in.
 *
 * HealthKit reports body mass in kilograms and there is no user-set unit
 * preference to honour, so the value is shown in kg as reported.
 */
export function WeightCard({ bodyMassKg }: WeightCardProps) {
  const {
    cardBackground: cardBg,
    text: textColor,
    subtitleText: subtitleColor,
    accent: accentColor,
    border: borderColor,
  } = useTheme()

  const value = bodyMassKg != null ? bodyMassKg.toFixed(1) : '--'

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.left}>
        <View style={styles.headerRow}>
          <View style={[styles.iconBadge, { backgroundColor: accentColor }]}>
            <Ionicons name="scale" size={14} color="#FFF" />
          </View>
          <Text style={[styles.label, { color: subtitleColor }]}>Weight</Text>
        </View>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: textColor }]}>{value}</Text>
          <Text style={[styles.unit, { color: subtitleColor }]}>kg</Text>
        </View>
        <Text style={[styles.caption, { color: subtitleColor }]}>
          {bodyMassKg != null
            ? 'Latest weigh-in from Health'
            : 'No weigh-in recorded'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  left: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
  },
  unit: {
    fontSize: 14,
    fontWeight: '600',
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
})
