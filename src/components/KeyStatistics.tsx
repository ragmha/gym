import Ionicons from '@expo/vector-icons/Ionicons'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useThemeColor } from '@/hooks/useThemeColor'

interface StatRow {
  icon: React.ComponentProps<typeof Ionicons>['name']
  iconColor: string
  label: string
  value: string
  subValue?: string
  trend?: 'up' | 'down' | 'neutral'
}

interface KeyStatisticsProps {
  stats: StatRow[]
}

export function KeyStatistics({ stats }: KeyStatisticsProps) {
  const textColor = useThemeColor({}, 'text')
  const subtitleColor = useThemeColor({}, 'subtitleText')
  const cardBg = useThemeColor({}, 'cardSurface')
  const accentColor = useThemeColor({}, 'accent')

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Key Statistics
        </Text>
        <TouchableOpacity>
          <Text style={[styles.customizeText, { color: accentColor }]}>
            Customise
          </Text>
        </TouchableOpacity>
      </View>
      {stats.map((stat) => (
        <View
          key={stat.label}
          style={[styles.row, { backgroundColor: cardBg }]}
        >
          <View style={styles.rowLeft}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${stat.iconColor}20` },
              ]}
            >
              <Ionicons name={stat.icon} size={18} color={stat.iconColor} />
            </View>
            <Text style={[styles.rowLabel, { color: textColor }]}>
              {stat.label.toUpperCase()}
            </Text>
          </View>
          <View style={styles.rowRight}>
            <Text style={[styles.rowValue, { color: textColor }]}>
              {stat.value}
            </Text>
            {stat.trend && (
              <Ionicons
                name={
                  stat.trend === 'up'
                    ? 'caret-up'
                    : stat.trend === 'down'
                      ? 'caret-down'
                      : 'remove-outline'
                }
                size={14}
                color={
                  stat.trend === 'up'
                    ? '#30D158'
                    : stat.trend === 'down'
                      ? '#E8707A'
                      : subtitleColor
                }
              />
            )}
            {stat.subValue && (
              <Text style={[styles.rowSubValue, { color: subtitleColor }]}>
                {stat.subValue}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  customizeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  rowSubValue: {
    fontSize: 13,
    fontWeight: '500',
  },
})
