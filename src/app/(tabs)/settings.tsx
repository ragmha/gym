import Ionicons from '@expo/vector-icons/Ionicons'
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import Header from '@/components/Header'
import { useHealthKit } from '@/hooks/useHealthKit'
import { useThemeColor } from '@/hooks/useThemeColor'
import { isHealthKitAvailable } from '@/lib/healthkit'
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
  const textColor = useThemeColor({}, 'text')
  const cardBg = useThemeColor({}, 'cardBackground')
  const subtextColor = useThemeColor({}, 'icon')
  const accentColor = useThemeColor({}, 'accent')
  const { isAuthorized, requestAuthorization } = useHealthKit()
  const preference = useThemeStore((s) => s.preference)
  const setPreference = useThemeStore((s) => s.setPreference)

  const showHealthKit = Platform.OS === 'ios' && isHealthKitAvailable()

  const handleToggle = async () => {
    if (!isAuthorized) {
      await requestAuthorization()
    } else {
      // HealthKit permissions can only be revoked in iOS Settings
      Linking.openURL('x-apple-health://')
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar />
      <Header>Settings</Header>

      {showHealthKit && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>
            Health
          </Text>
          <View style={[styles.card, { backgroundColor: cardBg }]}>
            <View style={styles.row}>
              <View style={styles.rowTextContainer}>
                <Text style={[styles.rowTitle, { color: textColor }]}>
                  Apple Health
                </Text>
                <Text style={[styles.rowSubtitle, { color: subtextColor }]}>
                  {isAuthorized
                    ? 'Connected — reading steps, calories, workouts'
                    : 'Connect to see health data on the home screen'}
                </Text>
              </View>
              <Switch
                testID="apple-health-switch"
                value={isAuthorized}
                onValueChange={handleToggle}
                trackColor={{ true: '#34C759' }}
              />
            </View>

            {isAuthorized && (
              <TouchableOpacity
                style={styles.manageLink}
                onPress={() => Linking.openURL('x-apple-health://')}
              >
                <Text style={[styles.manageLinkText, { color: '#007AFF' }]}>
                  {'Manage in Health app →'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Appearance */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>
          Appearance
        </Text>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <View style={styles.themeRow}>
            {THEME_OPTIONS.map((opt) => {
              const isSelected = preference === opt.value
              return (
                <Pressable
                  key={opt.value}
                  style={[
                    styles.themeOption,
                    isSelected && { backgroundColor: accentColor },
                  ]}
                  onPress={() => setPreference(opt.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${opt.label} theme`}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={isSelected ? '#fff' : subtextColor}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isSelected ? '#fff' : textColor },
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
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  rowSubtitle: {
    fontSize: 13,
  },
  manageLink: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.3)',
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
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
})
