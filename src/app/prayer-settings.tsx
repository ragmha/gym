import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import {
  CircleButton,
  Divider,
  FONTS,
  Label,
  PillButton,
  Segmented,
  useNothing,
} from '@/components/prayer/Nothing'
import { Layout } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import {
  PRAYER_METHODS,
  type PrayerLocation,
  type PrayerMethod,
} from '@/lib/prayer'
import {
  currentLocation,
  prayerNativeSupport,
  PRAYER_NATIVE_VERSION,
  searchCities,
} from '@/lib/prayerLocation'
import { syncPrayerReminders } from '@/lib/prayerReminders'
import { useThemeStore } from '@/stores/ThemeStore'

const MADHABS = [
  { value: 'shafi', label: 'Shafi' },
  { value: 'hanafi', label: 'Hanafi' },
] as const
const HIGH_LATITUDE = [
  { value: 'middleofthenight', label: 'Middle' },
  { value: 'seventhofthenight', label: 'Seventh' },
  { value: 'twilightangle', label: 'Twilight' },
] as const

type Status = { kind: 'loading' | 'saved' | 'error'; text: string } | null

export default function PrayerSettingsScreen() {
  const p = useNothing()
  const colorScheme = useColorScheme()
  const router = useRouter()
  const settings = useThemeStore((state) => state.prayer)
  const setPrayer = useThemeStore((state) => state.setPrayer)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PrayerLocation[]>([])
  const [locationStatus, setLocationStatus] = useState<Status>(null)
  const [reminderStatus, setReminderStatus] = useState<Status>(null)

  useEffect(() => {
    const name = query.trim()
    if (name.length < 2) {
      setResults([])
      setLocationStatus((status) =>
        status?.kind === 'loading' && status.text === 'Searching'
          ? null
          : status,
      )
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLocationStatus({ kind: 'loading', text: 'Searching' })
      searchCities(name, controller.signal)
        .then((found) => {
          setResults(found)
          setLocationStatus(
            found.length ? null : { kind: 'error', text: 'No matching city' },
          )
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          setLocationStatus({
            kind: 'error',
            text: error instanceof Error ? error.message : 'Search failed',
          })
        })
    }, 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  const choose = (location: PrayerLocation) => {
    setPrayer({ location })
    setQuery('')
    setResults([])
    setLocationStatus({ kind: 'saved', text: 'Saved' })
  }

  const locate = async () => {
    setLocationStatus({ kind: 'loading', text: 'Locating' })
    try {
      choose(await currentLocation())
    } catch (error) {
      setLocationStatus({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Location unavailable',
      })
    }
  }

  const setReminders = async (reminders: boolean) => {
    setReminderStatus({ kind: 'loading', text: 'Updating' })
    try {
      const status = await syncPrayerReminders(
        { ...settings, reminders },
        { request: reminders },
      )
      if (status === 'on' || status === 'off') {
        setPrayer({ reminders })
        setReminderStatus(
          status === 'on'
            ? { kind: 'saved', text: 'Reminders on for the next 12 days' }
            : null,
        )
      } else {
        setPrayer({ reminders: false })
        const support = prayerNativeSupport('Schedule prayer reminders')
        setReminderStatus({
          kind: 'error',
          text:
            status === 'denied'
              ? 'Allow notifications for gym in Settings'
              : support.available
                ? `A new iOS build with notifications (version ${PRAYER_NATIVE_VERSION} or later) is required.`
                : support.message,
        })
      }
    } catch {
      setReminderStatus({
        kind: 'error',
        text: 'Reminders could not be updated',
      })
    }
  }

  const statusLabel = (status: Status) =>
    status && (
      <Label color={status.kind === 'error' ? p.accent : p.primary}>
        {status.kind === 'loading'
          ? `[${status.text}...]`
          : `[${status.kind === 'error' ? 'Error: ' : ''}${status.text}]`}
      </Label>
    )

  return (
    <SafeAreaView
      testID="prayer-settings-screen"
      style={[styles.container, { backgroundColor: p.bg }]}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.topBar}>
        <CircleButton icon="chevron-back" label="Back" onPress={router.back} />
        <Label>Prayer settings</Label>
        <View style={styles.spacer} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Label>Location</Label>
          <Text style={[styles.city, { color: p.display }]}>
            {settings.location.name}
          </Text>
          <Label>
            {`${settings.location.latitude.toFixed(2)}°, ${settings.location.longitude.toFixed(2)}°`}
          </Label>
          <PillButton
            label="Use current location"
            onPress={locate}
            disabled={locationStatus?.kind === 'loading'}
            style={styles.start}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search city"
            placeholderTextColor={p.disabled}
            accessibilityLabel="Search city"
            autoCorrect={false}
            returnKeyType="search"
            style={[
              styles.input,
              { color: p.display, borderBottomColor: p.borderVisible },
            ]}
          />
          {statusLabel(locationStatus)}
          {results.map((result) => (
            <Pressable
              key={`${result.latitude},${result.longitude},${result.name}`}
              accessibilityRole="button"
              onPress={() => choose(result)}
              style={({ pressed }) => [
                styles.result,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.option, { color: p.primary }]}>
                {result.name}
              </Text>
              <Label>
                {`${result.latitude.toFixed(2)}°, ${result.longitude.toFixed(2)}°`}
              </Label>
            </Pressable>
          ))}
        </View>

        <View style={styles.section}>
          <Label>Calculation method</Label>
          <View accessibilityRole="radiogroup">
            {(Object.keys(PRAYER_METHODS) as PrayerMethod[]).map((method) => {
              const selected = settings.method === method
              return (
                <View key={method}>
                  <Divider />
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    aria-checked={selected}
                    onPress={() => setPrayer({ method })}
                    style={({ pressed }) => [
                      styles.choice,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.option,
                        { color: selected ? p.display : p.secondary },
                      ]}
                    >
                      {PRAYER_METHODS[method]}
                    </Text>
                    <View
                      style={[
                        styles.dot,
                        selected
                          ? { backgroundColor: p.display }
                          : { borderWidth: 1, borderColor: p.borderVisible },
                      ]}
                    />
                  </Pressable>
                </View>
              )
            })}
            <Divider />
          </View>
        </View>

        <View style={styles.row}>
          <Label>Asr</Label>
          <Segmented
            label="Asr"
            options={MADHABS}
            value={settings.madhab}
            onChange={(madhab) => setPrayer({ madhab })}
          />
        </View>
        <View style={styles.section}>
          <Label>High latitude rule</Label>
          <Segmented
            label="High latitude rule"
            options={HIGH_LATITUDE}
            value={settings.highLatitudeRule}
            onChange={(highLatitudeRule) => setPrayer({ highLatitudeRule })}
          />
          <Text style={[styles.body, { color: p.secondary }]}>
            How Fajr and Isha are estimated when twilight never ends, such as
            Finnish summers.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.row}>
            <Label>Reminders</Label>
            <Switch
              accessibilityLabel="Prayer reminders"
              value={settings.reminders}
              disabled={reminderStatus?.kind === 'loading'}
              onValueChange={(value) => void setReminders(value)}
              trackColor={{ false: p.borderVisible, true: p.display }}
              thumbColor={settings.reminders ? p.inverse : p.surface}
              ios_backgroundColor={p.borderVisible}
            />
          </View>
          <Text style={[styles.body, { color: p.secondary }]}>
            A notification at each prayer time, scheduled on this device.
          </Text>
          {statusLabel(reminderStatus)}
        </View>

        <View style={styles.section}>
          <Label>Import history</Label>
          <Text style={[styles.body, { color: p.secondary }]}>
            History stays in Athan's browser storage. An Export to Gym action in
            the web app must create a transfer link before it can be imported
            here; Gym will ask you to confirm the merge.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Layout.gutter,
    paddingVertical: 8,
  },
  spacer: { width: 48 },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingBottom: 48,
    gap: 36,
  },
  section: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  start: { alignSelf: 'flex-start' },
  city: {
    fontFamily: FONTS.body,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  input: {
    fontFamily: FONTS.body,
    fontSize: 17,
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  result: { paddingVertical: 10, gap: 2 },
  choice: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  option: { fontFamily: FONTS.body, fontSize: 17 },
  body: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 21 },
  dot: { width: 10, height: 10, borderRadius: 5 },
})
