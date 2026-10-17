import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

export function ScreenHeader({
  title,
  subtitle,
  backLabel = 'Go back',
  onBack,
  backDisabled = false,
  action,
}: {
  title: string
  subtitle?: string
  backLabel?: string
  onBack?: () => void
  backDisabled?: boolean
  /** Optional trailing control, e.g. Done. */
  action?: ReactNode
}) {
  const router = useRouter()
  const theme = useTheme()
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => {
          if (!backDisabled) (onBack ?? router.back)()
        }}
        disabled={backDisabled}
        accessibilityState={{ disabled: backDisabled }}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        style={({ pressed }) => [
          styles.back,
          {
            backgroundColor: theme.cardSurface,
            opacity: backDisabled ? 0.45 : pressed ? 0.65 : 1,
          },
        ]}
      >
        <Ionicons name="chevron-back" size={22} color={theme.text} />
      </Pressable>
      <View style={styles.copy}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.text }]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  back: {
    width: Layout.controlSize,
    height: Layout.controlSize,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  title: Typography.headingLg,
})
