import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import {
  Elevation,
  Layout,
  Radii,
  Spacing,
  Typography,
} from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { type ThemePreference, useThemeStore } from '@/stores/ThemeStore'
import { StatusBar } from 'expo-status-bar'

const THEME_OPTIONS: {
  value: ThemePreference
  label: string
  icon: React.ComponentProps<typeof Ionicons>['name']
}[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
]

export default function SettingsScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const {
    background: backgroundColor,
    text: textColor,
    cardBackground: cardBg,
    subtitleText: subtextColor,
    accent: accentColor,
    success: successColor,
    danger: dangerColor,
    border: borderColor,
    separator: separatorColor,
    accentInactive,
    selectedText,
  } = useTheme()
  const {
    isDemoMode,
    authorizationStatus,
    authorizationError,
    requestAuthorization,
  } = useHealthSnapshot()
  const isRequestingAccess = authorizationStatus === 'requesting'
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)
  const customOrder = useThemeStore(
    (s) => s.tileOrder.length > 0 || s.gymTileOrder.length > 0,
  )
  const setTileOrder = useThemeStore((s) => s.setTileOrder)
  const setGymTileOrder = useThemeStore((s) => s.setGymTileOrder)
  const resetTileOrder = () => {
    setTileOrder([])
    setGymTileOrder([])
  }

  const showHealthKit = Platform.OS === 'ios' && !isDemoMode

  const openHealth = async () => {
    try {
      await Linking.openURL('x-apple-health://')
    } catch {
      Alert.alert(
        'Unable to open Health',
        'Review this app’s Health access in iOS Settings instead.',
      )
    }
  }

  return (
    <SafeAreaView
      testID="settings-screen"
      edges={['top', 'left', 'right']}
      style={[styles.safe, { backgroundColor }]}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScreenHeader title="Settings" backLabel="Back" />
      <ScrollView
        style={{ backgroundColor }}
        contentContainerStyle={styles.container}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: textColor }]}
          >
            Health
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.rowTitle, { color: textColor }]}>
              Apple Health
            </Text>
            <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
              {showHealthKit
                ? 'Dashboard access is read-only. Add weight asks separately to save only body mass to Apple Health. Apple does not disclose which read permissions you have enabled.'
                : 'Apple Health is unavailable here. The dashboard shows demo data, not your health records.'}
            </Text>
            {showHealthKit && (
              <>
                <Pressable
                  testID="review-health-access"
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: isRequestingAccess,
                    busy: isRequestingAccess,
                  }}
                  disabled={isRequestingAccess}
                  onPress={() => void requestAuthorization()}
                  style={({ pressed }) => [
                    styles.accessButton,
                    {
                      backgroundColor: accentColor,
                      opacity: pressed ? 0.7 : 1,
                    },
                    isRequestingAccess && styles.disabledButton,
                  ]}
                >
                  <Text
                    style={[styles.accessButtonText, { color: selectedText }]}
                  >
                    {isRequestingAccess
                      ? 'Requesting Health access…'
                      : 'Connect / Review Health access'}
                  </Text>
                </Pressable>
                {authorizationStatus === 'completed' && (
                  <Text
                    selectable
                    style={[styles.accessMessage, { color: successColor }]}
                  >
                    Access request completed. Read permissions remain private to
                    you.
                  </Text>
                )}
                {authorizationError && (
                  <Text
                    selectable
                    accessibilityRole="alert"
                    style={[styles.accessMessage, { color: dangerColor }]}
                  >
                    {authorizationError}
                  </Text>
                )}
                <Text style={[styles.accessMessage, { color: subtextColor }]}>
                  New permissions may show a prompt. To change previously denied
                  access, review this app’s permissions in Health or iOS
                  Settings.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.manageLink,
                    { borderTopColor: separatorColor },
                  ]}
                  accessibilityRole="button"
                  onPress={() => void openHealth()}
                >
                  <Text style={[styles.manageLinkText, { color: accentColor }]}>
                    {'Manage in Health app →'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: textColor }]}
          >
            Home Screen widget
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <Text style={[styles.rowTitle, { color: textColor }]}>
              Daily rings
            </Text>
            <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
              {Platform.OS === 'ios'
                ? 'On version 1.0.11 or later, touch and hold your Home Screen, choose Edit → Add Widget, and search for gym. Open today’s dashboard first to refresh the rings.'
                : 'Daily rings requires a compatible iOS app. Widgets are not available in the web or Android preview.'}
            </Text>
            <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
              Steps, water, and active calories use display targets of 20,000
              steps, 2.5 L, and 500 kcal. These are widget targets, not medical
              recommendations or changes to Home goals.
            </Text>
            <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
              Only this summary is shared on-device with the widget. Readings
              expire after one hour or at midnight and show -- until you reopen
              today’s dashboard. iOS controls when widgets redraw; they are not
              live readings.
            </Text>
          </View>
        </View>

        {Platform.OS === 'ios' && (
          <View style={styles.section}>
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, { color: textColor }]}
            >
              Experimental
            </Text>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/phone-rest',
                  params: { date: localDateKey(new Date()) },
                })
              }
              accessibilityRole="button"
              accessibilityLabel="Phone rest"
              accessibilityHint="Set up an optional Screen Time inactivity estimate"
              style={({ pressed }) => [
                styles.card,
                styles.experimentalRow,
                { backgroundColor: cardBg, opacity: pressed ? 0.65 : 1 },
              ]}
            >
              <View style={styles.experimentalCopy}>
                <Text style={[styles.rowTitle, { color: textColor }]}>
                  Phone rest
                </Text>
                <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
                  Optional Screen Time estimate, separate from sleep.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={accentColor} />
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: textColor }]}
          >
            Appearance
          </Text>
          <View style={[styles.appearance, { backgroundColor: cardBg }]}>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Appearance"
            >
              {THEME_OPTIONS.map((opt, index) => {
                const isSelected = preference === opt.value
                return (
                  <Pressable
                    key={opt.value}
                    style={({ pressed }) => [
                      styles.themeOption,
                      {
                        backgroundColor: isSelected ? accentInactive : cardBg,
                        borderBottomColor:
                          index < THEME_OPTIONS.length - 1
                            ? borderColor
                            : 'transparent',
                        opacity: pressed ? 0.65 : 1,
                      },
                    ]}
                    onPress={() => setPreference(opt.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${opt.label} theme`}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={20}
                      color={isSelected ? accentColor : subtextColor}
                    />
                    <Text style={[styles.themeLabel, { color: textColor }]}>
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={22}
                        color={accentColor}
                      />
                    )}
                  </Pressable>
                )
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: textColor }]}
          >
            Layout
          </Text>
          <Pressable
            testID="reset-tile-order"
            onPress={resetTileOrder}
            disabled={!customOrder}
            accessibilityRole="button"
            accessibilityState={{ disabled: !customOrder }}
            accessibilityHint="Puts Home and Gym tiles back in their default order"
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: cardBg, opacity: pressed ? 0.65 : 1 },
              !customOrder && styles.disabledButton,
            ]}
          >
            <Text style={[styles.rowTitle, { color: textColor }]}>
              Reset tile order
            </Text>
            <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
              {customOrder
                ? 'Home and Gym use your arrangement.'
                : 'Home and Gym use the default order. Hold a tile to rearrange.'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.headingMd,
    paddingHorizontal: Spacing.xxs,
  },
  card: {
    ...Elevation.soft,
    borderRadius: Radii.panel,
    borderCurve: 'continuous',
    padding: Spacing.xl,
  },
  appearance: {
    ...Elevation.soft,
    borderRadius: Radii.panel,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  experimentalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  experimentalCopy: { flex: 1 },
  rowTitle: {
    ...Typography.headingSm,
    marginBottom: Spacing.xs,
  },
  rowSubtitle: {
    ...Typography.bodySm,
  },
  accessButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: Layout.controlSize,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessButtonText: {
    ...Typography.labelLg,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  accessMessage: {
    marginTop: Spacing.md,
    ...Typography.bodySm,
  },
  manageLink: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    minHeight: 48,
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  manageLinkText: {
    ...Typography.labelLg,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 64,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  themeLabel: {
    ...Typography.bodyMd,
    flex: 1,
  },
})
