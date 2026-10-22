import { useEffect, useRef, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import { commuteSchema, type Station } from '@/lib/planner'
import { plannerNative } from '@/lib/plannerNative'
import { searchStations, transitKeySchema } from '@/lib/transit'
import { useThemeStore } from '@/stores/ThemeStore'

export function CommuteSetup({ onClose }: { onClose: () => void }) {
  const theme = useTheme()
  const stored = useThemeStore((state) => state.commute)
  const parsed = commuteSchema.safeParse(stored)
  const saved = parsed.success ? parsed.data : null
  const setCommute = useThemeStore((state) => state.setCommute)
  const [home, setHome] = useState(saved?.home ?? null)
  const [work, setWork] = useState(saved?.work ?? null)
  const [start, setStart] = useState(saved?.start ?? '09:00')
  const [end, setEnd] = useState(saved?.end ?? '17:00')
  const [homeWalk, setHomeWalk] = useState(String(saved?.homeWalkMinutes ?? 5))
  const [workWalk, setWorkWalk] = useState(String(saved?.workWalkMinutes ?? 5))
  const [key, setKey] = useState('')
  const [term, setTerm] = useState('')
  const [target, setTarget] = useState<'home' | 'work'>('home')
  const [stations, setStations] = useState<Station[]>([])
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const request = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      request.current?.abort()
    }
  }, [])

  const native = plannerNative()
  const button = (title: string, onPress: () => void, disabled = false) => (
    <Pressable
      key={title}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: theme.surfaceElevated,
          opacity: disabled || busy ? 0.5 : 1,
        },
      ]}
    >
      <Text style={{ color: theme.text }}>{title}</Text>
    </Pressable>
  )
  const field = (
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    numeric = false,
  ) => (
    <View style={styles.field}>
      <Text style={{ color: theme.subtitleText }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        editable={!busy}
        keyboardType={numeric ? 'number-pad' : 'default'}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={100}
        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
      />
    </View>
  )
  const perform = async (action: () => Promise<void>) => {
    if (inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch {
      if (mounted.current)
        setError(
          'Could not complete commute setup. Check your key, connection and inputs, then retry.',
        )
    } finally {
      inFlight.current = false
      if (mounted.current) setBusy(false)
    }
  }
  const search = () =>
    perform(async () => {
      if (!native) throw new Error('Unavailable')
      const storedKey = await native.getTransitKey()
      if (!storedKey) {
        setError('Save your Digitransit key before searching.')
        return
      }
      const controller = new AbortController()
      request.current = controller
      const timeout = setTimeout(() => controller.abort(), 12_000)
      try {
        const found = await searchStations(term, storedKey, controller.signal)
        if (mounted.current) {
          setStations(found)
          if (!found.length) setNotice('No stations found. Try another name.')
        }
      } finally {
        clearTimeout(timeout)
      }
    })

  return (
    <Modal
      visible
      animationType="none"
      onRequestClose={() => {
        if (!busy) onClose()
      }}
    >
      <SafeAreaView
        style={[styles.screen, { backgroundColor: theme.homeBackground }]}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <Text
            accessibilityRole="header"
            style={[Typography.headingLg, { color: theme.text }]}
          >
            Commute setup
          </Text>
          <Text style={{ color: theme.subtitleText }}>
            Weekdays, in this device&apos;s local time. Only your station
            search, chosen station coordinates and journey times go to HSL.
            Calendar and Reminders never leave this device.
          </Text>
          {!native && (
            <Text accessibilityRole="alert" style={{ color: theme.danger }}>
              Requires a new iOS 17+ build.
            </Text>
          )}
          <Text style={{ color: theme.subtitleText }}>
            Enter your own Digitransit subscription key. Saved only in this
            iPhone&apos;s Keychain; never bundled or synced.
          </Text>
          <TextInput
            accessibilityLabel="Digitransit API key"
            value={key}
            onChangeText={setKey}
            editable={!busy && Boolean(native)}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={256}
            placeholder="New API key"
            placeholderTextColor={theme.subtitleText}
            style={[
              styles.input,
              { color: theme.text, borderColor: theme.border },
            ]}
          />
          {button(
            'Save API key',
            () => {
              if (!transitKeySchema.safeParse(key.trim()).success) {
                setError('Enter a valid API key.')
                return
              }
              void perform(async () => {
                await native!.setTransitKey(key.trim())
                if (mounted.current) {
                  setKey('')
                  setNotice('API key saved in Keychain.')
                }
              })
            },
            !native,
          )}
          {button(
            'Remove API key',
            () =>
              void perform(async () => {
                await native!.setTransitKey('')
                if (mounted.current) {
                  setKey('')
                  setNotice('API key removed.')
                }
              }),
            !native,
          )}
          <Text style={{ color: theme.text }}>
            Home stop: {home?.name ?? 'Not selected'}
          </Text>
          <Text style={{ color: theme.text }}>
            Work stop: {work?.name ?? 'Not selected'}
          </Text>
          <View style={styles.row}>
            {button(
              target === 'home' ? 'Choosing home stop' : 'Choose home stop',
              () => {
                setTarget('home')
                setStations([])
              },
            )}
            {button(
              target === 'work' ? 'Choosing work stop' : 'Choose work stop',
              () => {
                setTarget('work')
                setStations([])
              },
            )}
          </View>
          {field('Station name', term, (value) => {
            setTerm(value)
            setStations([])
          })}
          {button(
            'Search HSL stations',
            () => void search(),
            !native || term.trim().length < 2,
          )}
          {stations.map((station) =>
            button(`${station.name} (${station.gtfsId})`, () => {
              if (target === 'home') setHome(station)
              else setWork(station)
              setStations([])
              setTerm('')
            }),
          )}
          {field('Work starts (HH:MM)', start, setStart)}
          {field('Work ends (HH:MM)', end, setEnd)}
          {field(
            'Walk from home to station (minutes)',
            homeWalk,
            setHomeWalk,
            true,
          )}
          {field(
            'Walk from station to work (minutes)',
            workWalk,
            setWorkWalk,
            true,
          )}
          <Text style={{ color: theme.subtitleText }}>
            Walking estimates default to 5 minutes each; adjust them for your
            actual journey. These are added to HSL&apos;s station-to-station
            routing.
          </Text>
          {error && (
            <Text accessibilityRole="alert" style={{ color: theme.danger }}>
              {error}
            </Text>
          )}
          {notice && (
            <Text
              accessibilityLiveRegion="polite"
              style={{ color: theme.text }}
            >
              {notice}
            </Text>
          )}
          {button(
            'Save commute preferences',
            () => {
              const parsed = commuteSchema.safeParse({
                home,
                work,
                start,
                end,
                homeWalkMinutes: /^\d+$/.test(homeWalk)
                  ? Number(homeWalk)
                  : NaN,
                workWalkMinutes: /^\d+$/.test(workWalk)
                  ? Number(workWalk)
                  : NaN,
              })
              if (!parsed.success) {
                setError(
                  'Choose different stops, valid work times (start before end), and 0–120 walking minutes.',
                )
                return
              }
              setCommute(parsed.data)
              onClose()
            },
            !native,
          )}
          {button(
            'Remove commute preferences',
            () => {
              setCommute(null)
              onClose()
            },
            !saved,
          )}
          {button('Close commute setup', onClose)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    padding: Layout.gutter,
    gap: Spacing.md,
    maxWidth: Layout.contentMaxWidth,
    width: '100%',
    alignSelf: 'center',
  },
  field: { gap: Spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: Radii.sm,
    minHeight: Layout.controlSize,
    padding: Spacing.sm,
    ...Typography.bodyMd,
  },
  button: {
    minHeight: Layout.controlSize,
    justifyContent: 'center',
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
})
