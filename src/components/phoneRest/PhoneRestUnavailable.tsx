import { ScrollView, StyleSheet } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

export function PhoneRestUnavailable({ message }: { message: string }) {
  const theme = useTheme()
  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text
        accessibilityRole="header"
        style={[Typography.headingMd, { color: theme.text }]}
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
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.md },
})
