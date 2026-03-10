import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { useThemeColor } from '@/hooks/useThemeColor'

interface StatItem {
  icon: string
  value: string
  label: string
}

interface OverviewStatsProps {
  caloriesBurnt: number
  totalMinutes: number
  exerciseCount: number
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs === 0) return `${mins}min`
  return `${hrs}h ${mins}min`
}

export function OverviewStats({
  caloriesBurnt,
  totalMinutes,
  exerciseCount,
}: OverviewStatsProps) {
  const cardBg = useThemeColor({}, 'cardBackground')
  const textColor = useThemeColor({}, 'text')
  const subtextColor = useThemeColor({}, 'icon')

  const stats: StatItem[] = [
    {
      icon: '🔥',
      value: caloriesBurnt.toLocaleString(),
      label: 'Cal Burnt',
    },
    {
      icon: '⏱',
      value: formatDuration(totalMinutes),
      label: 'Total Time',
    },
    {
      icon: '🏋️',
      value: String(exerciseCount),
      label: 'Exercises',
    },
  ]

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Overview</Text>
      <View style={styles.row}>
        {stats.map((stat) => (
          <View
            key={stat.label}
            style={[styles.card, { backgroundColor: cardBg }]}
          >
            <Text style={styles.icon}>{stat.icon}</Text>
            <Text style={[styles.value, { color: textColor }]}>
              {stat.value}
            </Text>
            <Text style={[styles.label, { color: subtextColor }]}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: {
    fontSize: 24,
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
})
