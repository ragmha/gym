import { Ionicons } from '@expo/vector-icons'
import type { ComponentProps } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

export function SpeakingButton({
  label,
  icon,
  onPress,
  primary = false,
  disabled = false,
  hint,
}: {
  label: string
  icon: ComponentProps<typeof Ionicons>['name']
  onPress: () => void
  primary?: boolean
  disabled?: boolean
  hint?: string
}) {
  const theme = useTheme()
  const color = primary ? theme.homeBackground : theme.text
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? theme.text : theme.homeSurface,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[Typography.labelLg, { color }]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
})
