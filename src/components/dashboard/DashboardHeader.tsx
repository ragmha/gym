import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
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
      <View style={styles.topRow}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.text }]}
        >
          Your day
        </Text>
        <Pressable
          testID="open-coach"
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: theme.accentInactive },
            pressed && styles.pressed,
          ]}
          onPress={onCoachPress}
          accessibilityRole="button"
          accessibilityLabel="Open coach"
          accessibilityHint="Opens your AI coach chat"
        >
          <Ionicons
            name="chatbubble-outline"
            size={22}
            color={theme.homeAccent}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.iconButton,
            { backgroundColor: theme.homeSurface },
            pressed && styles.pressed,
          ]}
          onPress={onSettingsPress}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={theme.text} />
        </Pressable>
      </View>
      <Pressable
        style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
        onPress={onDatePress}
        accessibilityRole="button"
        accessibilityLabel={`Choose date, ${dateLabel}`}
        accessibilityState={{ expanded: calendarExpanded }}
        aria-expanded={calendarExpanded}
        accessibilityHint="Shows the week calendar"
      >
        <Ionicons
          name="calendar-outline"
          size={17}
          color={theme.subtitleText}
        />
        <Text style={[styles.dateLabel, { color: theme.subtitleText }]}>
          {dateLabel === 'TODAY'
            ? 'Today'
            : dateLabel.charAt(0) + dateLabel.slice(1).toLowerCase()}
        </Text>
        <Ionicons
          name={calendarExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.subtitleText}
        />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.sm,
    gap: Spacing.xxs,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    ...Typography.headingXl,
    flex: 1,
  },
  iconButton: {
    width: Layout.controlSize,
    height: Layout.controlSize,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  dateLabel: {
    ...Typography.bodySm,
    flexShrink: 1,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
})
