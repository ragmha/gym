import { Ionicons } from '@expo/vector-icons'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

export function HealthReadState({
  loading = false,
  error,
  onRetry,
  onStopReading,
  onEndDeepWork,
}: {
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onStopReading?: () => void
  onEndDeepWork?: () => void
}) {
  const theme = useTheme()
  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: theme.cardSurface }]}>
        {loading ? (
          <ActivityIndicator color={theme.accent} />
        ) : (
          <Ionicons name="cloud-offline-outline" size={28} color={theme.icon} />
        )}
      </View>
      <Text
        selectable
        accessibilityRole={loading ? undefined : 'alert'}
        style={[styles.message, { color: theme.text }]}
      >
        {loading
          ? 'Loading health data...'
          : (error ?? 'Unable to load health data')}
      </Text>
      {!loading && onStopReading ? (
        <Pressable
          onPress={onStopReading}
          accessibilityRole="button"
          accessibilityLabel="Stop reading timer"
          accessibilityHint="Ends the active Reading Live Activity"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[Typography.labelLg, { color: theme.selectedText }]}>
            Stop reading timer
          </Text>
        </Pressable>
      ) : null}
      {!loading && onEndDeepWork ? (
        <Pressable
          onPress={onEndDeepWork}
          accessibilityRole="button"
          accessibilityLabel="End deep work"
          accessibilityHint="Ends the Deep Work session and its Live Activity"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[Typography.labelLg, { color: theme.selectedText }]}>
            End deep work
          </Text>
        </Pressable>
      ) : null}
      {!loading && onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading health data"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[Typography.labelLg, { color: theme.selectedText }]}>
            Try again
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    minHeight: 260,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { ...Typography.bodyMd, textAlign: 'center' },
  button: {
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    justifyContent: 'center',
  },
})
