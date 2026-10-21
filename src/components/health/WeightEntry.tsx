import { Ionicons } from '@expo/vector-icons'
import type { IOSNativeProps } from '@react-native-community/datetimepicker'
import { usePreventRemove } from '@react-navigation/native'
import { Stack, useRouter } from 'expo-router'
import { useEffect, useRef, useState, type ComponentType } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { WeightRuler, rulerKilograms } from '@/components/health/WeightRuler'
import { loadWeightDateTimePicker } from '@/components/health/weightDateTimePicker'
import {
  Elevation,
  Layout,
  Radii,
  Spacing,
  Typography,
} from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useTheme } from '@/hooks/useThemeColor'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import {
  BodyMassWriteError,
  bodyMassErrorMessage,
  bodyMassUnavailable,
  initialBodyMassDate,
  parseBodyMassKilograms,
  validateBodyMassEntry,
} from '@/lib/healthSnapshot/bodyMass'
import { bodyMassWriter } from '@/lib/healthSnapshot/bodyMassWriter'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { WEIGHT_MAX_KG, WEIGHT_MIN_KG } from '@/lib/weightTrend'

const RULER_START_KG = 70
// UIKit lays out the inline calendar no narrower than this.
const INLINE_CALENDAR_MIN_WIDTH = 280

export function WeightEntry({ selectedDay }: { selectedDay: Date }) {
  const [support] = useState(() => {
    const availability = bodyMassWriter.getAvailability()
    const Picker = availability.available ? loadWeightDateTimePicker() : null
    return {
      availability:
        availability.available && !Picker
          ? bodyMassUnavailable('build-required')
          : availability,
      Picker,
    }
  })
  if (!support.availability.available || !support.Picker) {
    return (
      <WeightEntryUnavailable
        selectedDay={selectedDay}
        message={
          !support.availability.available
            ? support.availability.message
            : bodyMassErrorMessage(new BodyMassWriteError('build-required'))
        }
      />
    )
  }
  return <WeightEntryForm selectedDay={selectedDay} Picker={support.Picker} />
}

export function WeightEntryUnavailable({
  selectedDay,
  message,
}: {
  selectedDay?: Date
  message: string
}) {
  const theme = useTheme()
  const router = useRouter()
  const onBack = () =>
    router.dismissTo({
      pathname: '/',
      params: selectedDay ? { date: localDateKey(selectedDay) } : undefined,
    })
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScreenHeader
        title="Add weight"
        onBack={onBack}
        backLabel="Cancel weight entry"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={[styles.panel, { backgroundColor: theme.cardBackground }]}>
          <Ionicons name="scale-outline" size={32} color={theme.icon} />
          <Text
            accessibilityRole="header"
            style={[Typography.headingMd, { color: theme.text }]}
          >
            Apple Health weight entry
          </Text>
          <Text
            selectable
            accessibilityRole="alert"
            style={[Typography.bodyMd, { color: theme.subtitleText }]}
          >
            {message}
          </Text>
          <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
            Existing Health readings still work as before. No weight is stored
            in this app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function WeightEntryForm({
  selectedDay,
  Picker,
}: {
  selectedDay: Date
  Picker: ComponentType<IOSNativeProps>
}) {
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const router = useRouter()
  const { width } = useWindowDimensions()
  const [kilograms, setKilograms] = useState('')
  const [rulerKg, setRulerKg] = useState(RULER_START_KG)
  const [measuredAt, setMeasuredAt] = useState(() =>
    initialBodyMassDate(selectedDay),
  )
  const [timeConfirmed, setTimeConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const savingRef = useRef(false)
  const savedRef = useRef(false)
  const mounted = useRef(true)
  const touched = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    let active = true
    // Only positions the ruler; the weight stays empty until the user enters one.
    healthSnapshot
      .getBodyMassHistory(selectedDay, 30)
      .then((samples) => {
        const latest = samples[samples.length - 1]
        if (active && latest && !touched.current) {
          setRulerKg(rulerKilograms(latest.kilograms))
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [selectedDay])
  usePreventRemove(saving, () => undefined)

  const typeKilograms = (value: string) => {
    if (savingRef.current) return
    touched.current = true
    setKilograms(value)
    setError(null)
    try {
      const typed = parseBodyMassKilograms(value)
      if (typed >= WEIGHT_MIN_KG && typed <= WEIGHT_MAX_KG) {
        setRulerKg(rulerKilograms(typed))
      }
    } catch {
      // An unfinished draft leaves the ruler in place; Save reports invalid input.
    }
  }

  const dragKilograms = (next: number) => {
    if (savingRef.current) return
    touched.current = true
    setRulerKg(next)
    setKilograms(next.toFixed(1))
    setError(null)
  }

  const returnToDay = () => {
    if (savingRef.current) return
    router.dismissTo({
      pathname: '/',
      params: { date: localDateKey(selectedDay) },
    })
  }

  const save = async () => {
    if (savingRef.current || savedRef.current) return
    setError(null)
    try {
      const entry = validateBodyMassEntry({
        kilograms: parseBodyMassKilograms(kilograms),
        measuredAt,
      })
      if (!timeConfirmed) throw new BodyMassWriteError('confirm-time')
      savingRef.current = true
      setSaving(true)
      await bodyMassWriter.save(entry)
      savedRef.current = true
      if (mounted.current) setSaved(true)
    } catch (failure) {
      if (mounted.current) setError(bodyMassErrorMessage(failure))
    } finally {
      savingRef.current = false
      if (mounted.current) setSaving(false)
    }
  }

  const changeMeasurement: NonNullable<IOSNativeProps['onChange']> = (
    event,
    value,
  ) => {
    if (savingRef.current || event.type !== 'set' || !value) return
    setTimeConfirmed(false)
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
      setError(bodyMassErrorMessage(new BodyMassWriteError('invalid-date')))
      return
    }
    if (value.getTime() > Date.now()) {
      setError(bodyMassErrorMessage(new BodyMassWriteError('future-date')))
      return
    }
    setMeasuredAt(new Date(value))
    setError(null)
  }

  const timestamp = measuredAt.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })
  const pastDay = localDateKey(selectedDay) < localDateKey(new Date())
  const inline =
    Math.min(width, Layout.contentMaxWidth) -
      2 * (Layout.gutter + Spacing.md) >=
    INLINE_CALENDAR_MIN_WIDTH

  return (
    <SafeAreaView
      testID="weight-entry-screen"
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['top', 'left', 'right']}
    >
      <Stack.Screen
        options={{
          gestureEnabled: !saving,
          headerBackButtonMenuEnabled: !saving,
        }}
      />
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title="Add weight"
          onBack={returnToDay}
          backDisabled={saving}
          backLabel={saved ? 'Back to selected day' : 'Cancel weight entry'}
        />
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {saved ? (
            <View
              testID="weight-save-success"
              style={[styles.panel, { backgroundColor: theme.cardBackground }]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={40}
                color={theme.success}
              />
              <Text
                accessibilityRole="header"
                style={[Typography.headingLg, { color: theme.text }]}
              >
                Saved to Apple Health
              </Text>
              <Text
                selectable
                style={[Typography.bodyMd, { color: theme.subtitleText }]}
              >
                Home will read from Health again when you return. Read access is
                separate, so the saved weight may still be unavailable to this
                app.
              </Text>
              <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
                Morning weight uses only the first reading before local noon. An
                afternoon measurement is saved at its actual time, not treated
                as a morning weigh-in.
              </Text>
              <Pressable
                testID="weight-return-home"
                accessibilityRole="button"
                onPress={returnToDay}
                style={[styles.primary, { backgroundColor: theme.accent }]}
              >
                <Text
                  style={[styles.buttonText, { color: theme.selectedText }]}
                >
                  Back to selected day
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.readout}>
                <TextInput
                  testID="weight-kilograms"
                  accessibilityLabel="Weight in kilograms"
                  accessibilityHint="Enter a positive weight. A point or comma can mark the decimal."
                  value={kilograms}
                  onChangeText={typeKilograms}
                  editable={!saving}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  placeholder={rulerKg.toFixed(1)}
                  placeholderTextColor={theme.subtitleText}
                  maxLength={32}
                  // 88 pt already exceeds every Dynamic Type size.
                  allowFontScaling={false}
                  style={[styles.input, { color: theme.text }]}
                />
                <Text
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  style={[Typography.headingLg, { color: theme.subtitleText }]}
                >
                  kg
                </Text>
              </View>
              <WeightRuler
                value={rulerKg}
                onChange={dragKilograms}
                disabled={saving}
              />
              <Text
                style={[
                  Typography.bodySm,
                  styles.centered,
                  { color: theme.subtitleText },
                ]}
              >
                Type a weight or drag the ruler. Use a decimal point or comma,
                without thousands separators.
              </Text>

              <View
                style={[
                  styles.panel,
                  styles.calendar,
                  { backgroundColor: theme.cardBackground },
                ]}
              >
                <Text
                  accessibilityRole="header"
                  style={[Typography.headingMd, { color: theme.text }]}
                >
                  When did you measure it?
                </Text>
                {pastDay && (
                  <Text
                    style={[Typography.bodySm, { color: theme.subtitleText }]}
                  >
                    This is a past day. The initial time is the current local
                    time, not a known measurement time. Choose when you actually
                    weighed.
                  </Text>
                )}
                <Picker
                  testID="weight-date-time-picker"
                  accessibilityLabel="Measurement date and time"
                  mode="datetime"
                  display={inline ? 'inline' : 'compact'}
                  value={measuredAt}
                  maximumDate={new Date()}
                  onChange={changeMeasurement}
                  disabled={saving}
                  themeVariant={colorScheme}
                  accentColor={theme.accent}
                  style={inline ? styles.inlinePicker : styles.picker}
                />
                <Text
                  testID="weight-measured-at"
                  selectable
                  style={[Typography.bodyMd, { color: theme.text }]}
                >
                  {timestamp}
                </Text>
                <View style={styles.confirmation}>
                  <Switch
                    testID="weight-confirm-time"
                    accessibilityLabel="Confirm measurement date and time"
                    value={timeConfirmed}
                    onValueChange={(value) => {
                      if (!savingRef.current) setTimeConfirmed(value)
                    }}
                    disabled={saving}
                    hitSlop={8}
                    trackColor={{ true: theme.accent }}
                  />
                  <Text
                    style={[styles.confirmationText, { color: theme.text }]}
                  >
                    These are the actual measurement date and time.
                  </Text>
                </View>
                <Text
                  style={[Typography.bodySm, { color: theme.subtitleText }]}
                >
                  Morning weight uses the first reading before local noon, once
                  per day. Later readings still save to Health but do not
                  replace that morning reading.
                </Text>
              </View>

              <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
                Only the weight you confirm is written directly to Apple Health.
                Saving may ask for Body Mass write access. No copy is stored in
                this app.
              </Text>
              {error && (
                <Text
                  testID="weight-save-error"
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  selectable
                  style={[Typography.bodyMd, { color: theme.danger }]}
                >
                  {error}
                </Text>
              )}
              <Pressable
                testID="save-weight"
                accessibilityRole="button"
                accessibilityLabel="Save to Apple Health"
                accessibilityState={{
                  disabled: saving || !timeConfirmed,
                  busy: saving,
                }}
                disabled={saving || !timeConfirmed}
                onPress={() => void save()}
                style={({ pressed }) => [
                  styles.primary,
                  {
                    backgroundColor: theme.text,
                    opacity: saving || !timeConfirmed ? 0.5 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                {saving && <ActivityIndicator color={theme.homeBackground} />}
                <Text
                  style={[styles.buttonText, { color: theme.homeBackground }]}
                >
                  {saving ? 'Saving to Apple Health…' : 'Save to Apple Health'}
                </Text>
              </Pressable>
              <Pressable
                testID="cancel-weight-entry"
                accessibilityRole="button"
                accessibilityState={{ disabled: saving }}
                disabled={saving}
                onPress={returnToDay}
                style={styles.cancel}
              >
                <Text
                  style={[
                    Typography.labelLg,
                    { color: saving ? theme.disabled : theme.accent },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  panel: {
    ...Elevation.soft,
    backgroundColor: 'transparent',
    borderRadius: Radii.panel,
    borderCurve: 'continuous',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  readout: { alignItems: 'center', gap: Spacing.xxs },
  input: {
    ...Typography.displayXl,
    // A line height offsets single-line iOS text inputs.
    lineHeight: undefined,
    alignSelf: 'stretch',
    padding: 0,
    textAlign: 'center',
  },
  centered: { textAlign: 'center' },
  calendar: { padding: Spacing.md },
  picker: { minHeight: 48, alignSelf: 'flex-start', maxWidth: '100%' },
  // Fabric sizes the native calendar itself, so center it rather than stretch.
  inlinePicker: { alignSelf: 'center', maxWidth: '100%' },
  confirmation: {
    minHeight: 48,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.md,
  },
  confirmationText: { ...Typography.bodyMd, flex: 1, minWidth: 140 },
  primary: {
    minHeight: 56,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  buttonText: { ...Typography.labelLg, flexShrink: 1, textAlign: 'center' },
  cancel: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
  },
})
