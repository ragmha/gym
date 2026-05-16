import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useTheme } from '@/hooks/useThemeColor'
import { useTodayHydration } from '@/stores/HydrationStore'
import { useWeightStore } from '@/stores/WeightStore'

const KG_TO_LBS = 2.20462

export function BodyFooter() {
  const router = useRouter()
  const theme = useTheme()
  const { latestEntry, unit } = useWeightStore()
  const { totalMl: hydrationMl, goalMl: hydrationGoal } = useTodayHydration()

  const weightDisplay = latestEntry
    ? unit === 'lbs'
      ? (latestEntry.weightKg * KG_TO_LBS).toFixed(1)
      : latestEntry.weightKg.toFixed(1)
    : '—'

  const hydrationLiters = (hydrationMl / 1000).toFixed(1)
  const hydrationGoalLiters = (hydrationGoal / 1000).toFixed(1)
  const hydrationPct = Math.min(
    1,
    hydrationGoal > 0 ? hydrationMl / hydrationGoal : 0,
  )

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.cell, { backgroundColor: theme.cardElevated }]}
        onPress={() => router.push('/weight')}
        activeOpacity={0.7}
      >
        <View style={styles.cellHeader}>
          <Ionicons name="scale-outline" size={14} color={theme.subtitleText} />
          <Text style={[styles.label, { color: theme.subtitleText }]}>
            Weight
          </Text>
        </View>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: theme.text }]}>
            {weightDisplay}
          </Text>
          <Text style={[styles.unit, { color: theme.subtitleText }]}>
            {unit}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.cell, { backgroundColor: theme.cardElevated }]}
        onPress={() => router.push('/hydration')}
        activeOpacity={0.7}
      >
        <View style={styles.cellHeader}>
          <Ionicons name="water-outline" size={14} color={theme.subtitleText} />
          <Text style={[styles.label, { color: theme.subtitleText }]}>
            Hydration
          </Text>
        </View>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: theme.text }]}>
            {hydrationLiters}
          </Text>
          <Text style={[styles.unit, { color: theme.subtitleText }]}>
            / {hydrationGoalLiters}L
          </Text>
        </View>
        <View style={[styles.bar, { backgroundColor: theme.background }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${hydrationPct * 100}%`,
                backgroundColor: theme.hero,
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 24,
  },
  cell: {
    flex: 1,
    padding: 14,
    borderRadius: 18,
    gap: 6,
  },
  cellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 12,
    fontWeight: '600',
  },
  bar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
})
