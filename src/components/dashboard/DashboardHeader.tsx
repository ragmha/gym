import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

interface DashboardHeaderProps {
  dateLabel: string
  calendarExpanded: boolean
  onDatePress: () => void
  onCoachPress: () => void
  onSettingsPress: () => void
}

export function DashboardHeader({
  dateLabel,
  calendarExpanded,
  onDatePress,
  onCoachPress,
  onSettingsPress,
}: DashboardHeaderProps) {
  const theme = useTheme()

  return (
    <View style={styles.header}>
      <Pressable
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        onPress={onSettingsPress}
        accessibilityRole="button"
        accessibilityLabel="Settings"
      >
        <Ionicons name="settings-outline" size={24} color={theme.text} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.dateButton,
          { backgroundColor: theme.homeSurface },
          pressed && styles.pressed,
        ]}
        onPress={onDatePress}
        accessibilityRole="button"
        accessibilityLabel={`Choose date, ${dateLabel}`}
        accessibilityState={{ expanded: calendarExpanded }}
        aria-expanded={calendarExpanded}
        accessibilityHint="Shows the week calendar"
      >
        <Text style={[styles.dateLabel, { color: theme.text }]}>
          {dateLabel}
        </Text>
        <Ionicons
          name={calendarExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.subtitleText}
        />
      </Pressable>

      <Pressable
        testID="open-coach"
        style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        onPress={onCoachPress}
        accessibilityRole="button"
        accessibilityLabel="Open coach"
        accessibilityHint="Opens your AI coach chat"
      >
        <Ionicons
          name="chatbubbles-outline"
          size={24}
          color={theme.homeAccent}
        />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButton: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  dateLabel: {
    ...Typography.labelLg,
    flexShrink: 1,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
})
