import Ionicons from '@expo/vector-icons/Ionicons'
import { useRouter } from 'expo-router'
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import Header from '@/components/common/Header'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
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
    icon: subtextColor,
    accent: accentColor,
    success: successColor,
    danger: dangerColor,
    border: borderColor,
    separator: separatorColor,
    surfaceElevated,
    selectedText,
    shadow: shadowColor,
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
    <ScrollView
      style={{ backgroundColor }}
      contentContainerStyle={styles.container}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Header>Settings</Header>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={22} color={textColor} />
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Health</Text>
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor, shadowColor },
          ]}
        >
          <Text style={[styles.rowTitle, { color: textColor }]}>
            Apple Health
          </Text>
          <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
            {showHealthKit
              ? 'Read-only access to your health data. Apple does not disclose which read permissions you have enabled.'
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
                style={[
                  styles.accessButton,
                  { backgroundColor: accentColor },
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
                access, review this app’s permissions in Health or iOS Settings.
              </Text>
              <TouchableOpacity
                style={[styles.manageLink, { borderTopColor: separatorColor }]}
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

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Appearance
        </Text>
        <View
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor, shadowColor },
          ]}
        >
          <View style={styles.themeRow} accessibilityRole="radiogroup">
            {THEME_OPTIONS.map((opt) => {
              const isSelected = preference === opt.value
              return (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.themeOption,
                    {
                      backgroundColor: isSelected
                        ? accentColor
                        : surfaceElevated,
                      borderColor: isSelected ? accentColor : borderColor,
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
                    color={isSelected ? selectedText : subtextColor}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isSelected ? selectedText : textColor },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingTop: 50,
    paddingBottom: 24,
  },
  backBtn: {
    position: 'absolute',
    top: 104,
    left: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
  },
  accessButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  accessButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  accessMessage: {
    marginTop: 12,
    fontSize: 13,
  },
  manageLink: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  manageLinkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
})
