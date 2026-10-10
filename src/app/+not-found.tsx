import { Ionicons } from '@expo/vector-icons'
import { Link, Stack } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

export default function NotFoundScreen() {
  const theme = useTheme()
  return (
    <>
      <Stack.Screen options={{ title: 'Page not found' }} />
      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.icon, { backgroundColor: theme.cardSurface }]}>
          <Ionicons name="compass-outline" size={32} color={theme.icon} />
        </View>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.text }]}
        >
          This screen doesn&apos;t exist.
        </Text>
        <Text style={[styles.copy, { color: theme.subtitleText }]}>
          Your daily readings are still on Home.
        </Text>
        <Link href="/" asChild>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.link,
              { backgroundColor: theme.accent, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[Typography.labelLg, { color: theme.selectedText }]}>
              Back to home
            </Text>
          </Pressable>
        </Link>
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.gutter,
    gap: Spacing.lg,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...Typography.headingLg, textAlign: 'center' },
  copy: { ...Typography.bodyMd, textAlign: 'center' },
  link: {
    minHeight: Layout.controlSize,
    justifyContent: 'center',
    borderRadius: Radii.pill,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },
})
