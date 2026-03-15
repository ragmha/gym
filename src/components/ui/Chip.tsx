import Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps } from 'react'
import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

type ChipIconName = ComponentProps<typeof Ionicons>['name']

export interface ChipProps {
  label: string
  onPress?: () => void
  leadingIcon?: ChipIconName
  trailingIcon?: ChipIconName
  variant?: 'soft' | 'outline' | 'solid'
  tone?: 'neutral' | 'accent' | 'info'
  selected?: boolean
}

export function Chip({
  label,
  onPress,
  leadingIcon,
  trailingIcon,
  variant = 'soft',
  tone = 'neutral',
  selected = false,
}: ChipProps) {
  const {
    text,
    subtitleText: subtitle,
    border,
    accent,
    accentInactive,
    info,
    infoInactive,
    cardSurface: surface,
    selectedText,
  } = useTheme()

  const activeColor = tone === 'info' ? info : accent
  const inactiveColor = tone === 'info' ? infoInactive : accentInactive
  const isHighlighted = tone !== 'neutral' || selected

  const backgroundColor =
    variant === 'solid'
      ? isHighlighted
        ? activeColor
        : surface
      : variant === 'outline'
        ? 'transparent'
        : isHighlighted
          ? inactiveColor
          : surface

  const borderColor =
    variant === 'outline'
      ? isHighlighted
        ? activeColor
        : border
      : 'transparent'

  const contentColor =
    variant === 'solid'
      ? isHighlighted
        ? selectedText
        : text
      : isHighlighted
        ? activeColor
        : subtitle

  return (
    <Pressable
      accessibilityState={{ selected }}
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {leadingIcon ? (
        <Ionicons name={leadingIcon} size={12} color={contentColor} />
      ) : null}
      <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
      {trailingIcon ? (
        <View style={styles.trailingIcon}>
          <Ionicons name={trailingIcon} size={12} color={contentColor} />
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 32,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    ...Typography.labelMd,
  },
  trailingIcon: {
    marginLeft: -2,
  },
})
