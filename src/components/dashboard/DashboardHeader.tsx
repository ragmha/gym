import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useTheme } from '@/hooks/useThemeColor'

interface DashboardHeaderProps {
  /** Recovery score shown in the leading pill, 0-100. */
  recoveryScore: number
  recoveryColor: string
  /** Label for the currently selected day, e.g. "TODAY" or "MAR 4, 2025". */
  dateLabel: string
  onPreviousWeek: () => void
  onNextWeek: () => void
  onCoachPress: () => void
  onSettingsPress: () => void
}

export function DashboardHeader({
  recoveryScore,
  recoveryColor,
  dateLabel,
  onPreviousWeek,
  onNextWeek,
  onCoachPress,
  onSettingsPress,
}: DashboardHeaderProps) {
  const {
    cardBackground: cardBg,
    text: textColor,
    subtitleText: subtitleColor,
    accent: accentColor,
  } = useTheme()

  return (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <View style={styles.healthPill}>
          <View
            style={[styles.healthDot, { backgroundColor: recoveryColor }]}
          />
          <Text style={[styles.healthPillText, { color: recoveryColor }]}>
            {recoveryScore}%
          </Text>
        </View>

        <View style={styles.dateNav}>
          <TouchableOpacity
            onPress={onPreviousWeek}
            hitSlop={12}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={subtitleColor} />
          </TouchableOpacity>
          <Text style={[styles.dateNavLabel, { color: textColor }]}>
            {dateLabel}
          </Text>
          <TouchableOpacity
            onPress={onNextWeek}
            hitSlop={12}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={18} color={subtitleColor} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.coachBtn, { backgroundColor: cardBg }]}
            activeOpacity={0.7}
            onPress={onCoachPress}
            accessibilityRole="button"
            accessibilityLabel="Open coach"
            accessibilityHint="Opens your AI coach chat"
          >
            <Ionicons name="chatbubbles" size={16} color={accentColor} />
            <Text style={[styles.coachBtnText, { color: textColor }]}>
              Coach
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: cardBg }]}
            activeOpacity={0.7}
            onPress={onSettingsPress}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            accessibilityHint="Opens app settings"
          >
            <Ionicons name="settings-outline" size={18} color={textColor} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  healthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  healthPillText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateNavLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
  },
  coachBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
