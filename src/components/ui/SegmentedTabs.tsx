import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

export interface SegmentedTabOption<T extends string> {
  value: T
  label: string
}

interface SegmentedTabsProps<T extends string> {
  options: readonly SegmentedTabOption<T>[]
  value: T
  onChange: (value: T) => void
  tone?: 'accent' | 'neutral'
  fullWidth?: boolean
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  tone = 'accent',
  fullWidth = false,
}: SegmentedTabsProps<T>) {
  const {
    text,
    subtitleText: subtitle,
    accent,
    cardSurface: surface,
    surfaceElevated: elevated,
    selectedText,
  } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: surface }]}>
      {options.map((option) => {
        const isActive = option.value === value
        const activeBackground = tone === 'accent' ? accent : elevated
        const activeColor = tone === 'accent' ? selectedText : text

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.item,
              fullWidth && styles.itemFill,
              isActive && { backgroundColor: activeBackground },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? activeColor : subtitle },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.xl,
    padding: Spacing.xs,
    gap: Spacing.xs,
  },
  item: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.lg,
  },
  itemFill: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    ...Typography.labelLg,
  },
  pressed: {
    opacity: 0.9,
  },
})
