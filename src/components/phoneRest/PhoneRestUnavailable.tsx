import { Ionicons } from '@expo/vector-icons'
import { ScrollView, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import {
  Elevation,
  Layout,
  Radii,
  Spacing,
  Typography,
} from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

export function PhoneRestUnavailable({ message }: { message: string }) {
  const theme = useTheme()
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View style={[styles.icon, { backgroundColor: theme.cardSurface }]}>
        <Ionicons name="moon-outline" size={32} color={theme.text} />
      </View>
      <View style={[styles.panel, { backgroundColor: theme.cardBackground }]}>
        <Text
          accessibilityRole="header"
          style={[Typography.headingLg, { color: theme.text }]}
        >
          Phone rest
        </Text>
        <Text
          selectable
          style={[Typography.bodyMd, { color: theme.subtitleText }]}
        >
          {message}
        </Text>
        <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
          An optional phone-inactivity estimate, not measured sleep. No estimate
          is substituted when Screen Time is unavailable.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    padding: Layout.gutter,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    ...Elevation.soft,
    borderRadius: Radii.panel,
    borderCurve: 'continuous',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
})
