import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useMemo, useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import {
  PrayerDayBackdrop,
  PrayerDayCycle,
} from '@/components/prayer/PrayerDayCycle'
import {
  CircleButton,
  Divider,
  FONTS,
  Label,
  PillButton,
  SegmentBar,
  Segmented,
  useNothing,
} from '@/components/prayer/Nothing'
import { Layout } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import {
  calendarDateInTimeZone,
  decodePrayerHistory,
  formatCityClock,
  formatPrayerTime,
  HIGH_LATITUDE_RULES,
  nextPrayer,
  PRAYER_LABELS,
  PRAYER_METHODS,
  PRAYERS,
  prayerDayPhase,
  prayerStreak,
  prayerTimes,
  type Prayer,
  type PrayerSettings,
} from '@/lib/prayer'
import { usePrayerLogStore } from '@/stores/PrayerLogStore'
import { useThemeStore } from '@/stores/ThemeStore'

const NO_PRAYERS: readonly Prayer[] = []
const CLOCKS = [
  { value: '12h', label: '12H' },
  { value: '24h', label: '24H' },
] as const

export default function PrayerScreen() {
  return (
    <HealthDateRoute>{(date) => <PrayerForDate date={date} />}</HealthDateRoute>
  )
}

function useNow(ticking: boolean) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!ticking) return
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [ticking])
  return now
}

function PrayerForDate({ date }: { date: Date }) {
  const p = useNothing()
  const colorScheme = useColorScheme()
  const { width } = useWindowDimensions()
  const router = useRouter()
  const settings = useThemeStore((state) => state.prayer)
  const setPrayer = useThemeStore((state) => state.setPrayer)
  const now = useNow(true)
  const locationDay = calendarDateInTimeZone(now, settings.location.timezone)
  const locationDayKey = localDateKey(locationDay)
  const deviceDayKey = localDateKey(now)
  const { date: dateParam } = useLocalSearchParams<{
    date?: string | string[]
  }>()
  const selectedDate = useMemo(() => {
    if (dateParam !== undefined && dateParam !== deviceDayKey) return date
    const [year, month, day] = locationDayKey.split('-').map(Number)
    return new Date(year, month - 1, day, 12)
  }, [date, dateParam, deviceDayKey, locationDayKey])
  const key = localDateKey(selectedDate)
  const isToday = key === locationDayKey
  const prayed = usePrayerLogStore((state) => state.prayed)
  const toggle = usePrayerLogStore((state) => state.toggle)
  const marked = prayed[key] ?? NO_PRAYERS
  const heroFontSize = Math.min(96, Math.max(48, (width - 48) / 2.3))
  const times = useMemo(
    () => prayerTimes(selectedDate, settings),
    [selectedDate, settings],
  )
  const streak = prayerStreak(prayed, selectedDate)
  const future = key > locationDayKey
  const next = isToday ? nextPrayer(now, settings) : null

  return (
    <SafeAreaView
      testID="prayer-screen"
      style={[styles.container, { backgroundColor: p.bg }]}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.topBar}>
        <CircleButton
          icon="chevron-back"
          label="Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace('/')
          }
        />
        <Segmented
          label="Clock"
          options={CLOCKS}
          value={settings.clock}
          onChange={(clock) => setPrayer({ clock })}
        />
      </View>
      <View style={styles.scene}>
        {/* Below the top bar so the clock and bar sit on flat grey. */}
        <PrayerDayBackdrop
          phase={isToday ? prayerDayPhase(now, times) : null}
        />
        <ScrollView contentContainerStyle={styles.content}>
          <HistoryImport />
          {isToday ? (
            <CityClock
              now={now}
              location={settings.location.name}
              clock={settings.clock}
              timeZone={settings.location.timezone}
            />
          ) : (
            <View
              accessible
              accessibilityLabel={`${marked.length} of ${PRAYERS.length} prayed`}
              style={styles.hero}
            >
              <Label>Prayed</Label>
              <Text
                style={[
                  styles.digits,
                  {
                    color: p.display,
                    fontSize: heroFontSize,
                    lineHeight: heroFontSize * 1.05,
                  },
                ]}
              >
                {`${marked.length}/${PRAYERS.length}`}
              </Text>
            </View>
          )}
          <View style={styles.place}>
            {!isToday ? (
              <Text
                style={[styles.city, { color: p.display }]}
                numberOfLines={2}
              >
                {settings.location.name}
              </Text>
            ) : null}
            <Label>
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
              {` · ${marked.length}/${PRAYERS.length} prayed · streak ${streak} ${streak === 1 ? 'day' : 'days'}`}
            </Label>
            <SegmentBar total={PRAYERS.length} filled={marked.length} />
          </View>
          {next ? (
            <Countdown
              prayer={next.prayer}
              ms={next.time.getTime() - now.getTime()}
            />
          ) : null}
          <View>
            {PRAYERS.map((prayer) => {
              const checked = marked.includes(prayer)
              const label = PRAYER_LABELS[prayer]
              const time = formatPrayerTime(
                times[prayer],
                settings.clock,
                settings.location.timezone,
              )
              const spoken = time.period
                ? `${time.time} ${time.period}`
                : time.time
              return (
                <View key={prayer}>
                  <Divider />
                  <Pressable
                    testID={`prayer-${prayer}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked, disabled: future }}
                    aria-checked={checked}
                    aria-disabled={future}
                    accessibilityLabel={`${label.en}, ${spoken}`}
                    disabled={future}
                    onPress={() => toggle(key, prayer)}
                    style={({ pressed }) => [
                      styles.row,
                      { opacity: future ? 0.4 : pressed ? 0.6 : 1 },
                    ]}
                  >
                    <View style={styles.name}>
                      <Label
                        color={next?.prayer === prayer ? p.accent : undefined}
                      >
                        {next?.prayer === prayer
                          ? `${label.ar} · next`
                          : label.ar}
                      </Label>
                      <Text style={[styles.prayer, { color: p.primary }]}>
                        {label.en}
                      </Text>
                    </View>
                    <Text style={[styles.time, { color: p.display }]}>
                      {time.time}
                    </Text>
                    <View style={styles.side}>
                      <Label>{time.period ?? ' '}</Label>
                      <View
                        style={[
                          styles.dot,
                          checked
                            ? { backgroundColor: p.display }
                            : { borderWidth: 1, borderColor: p.borderVisible },
                        ]}
                      />
                    </View>
                  </Pressable>
                </View>
              )
            })}
            <Divider />
          </View>
          <PrayerDayCycle
            now={isToday ? now : null}
            times={times}
            clock={settings.clock}
            timeZone={settings.location.timezone}
          />
          <Label style={styles.note}>
            {`${PRAYER_METHODS[settings.method]} · ${settings.madhab} asr · ${HIGH_LATITUDE_RULES[settings.highLatitudeRule]}. Calculated on this device; your checklist stays here.`}
          </Label>
        </ScrollView>
      </View>
      <View style={styles.nav}>
        <CircleButton
          icon="search-outline"
          label="Prayer settings"
          onPress={() => router.push('/prayer-settings')}
        />
        <CircleButton icon="time-outline" label="Prayer times" active />
        <CircleButton
          icon="compass-outline"
          label="Qibla"
          onPress={() => router.push('/qibla')}
        />
      </View>
    </SafeAreaView>
  )
}

function CityClock({
  now,
  location,
  clock,
  timeZone,
}: {
  now: Date
  location: string
  clock: PrayerSettings['clock']
  timeZone: string
}) {
  const p = useNothing()
  const time = formatCityClock(now, clock, timeZone)
  // Compact so the prayer list stays in view below the clock.
  const fontSize = 64
  // Nothing grey-scale hierarchy: 30% / 60% / 100%.
  const parts = [
    { value: time.hour, unit: 'h', opacity: 0.3 },
    { value: time.minute, unit: 'min', opacity: 0.6 },
    { value: time.second ?? '00', unit: 'sec', opacity: 1 },
  ]
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`${location} local time ${time.hour}:${time.minute}:${time.second}${time.period ? ` ${time.period}` : ''}`}
      style={[styles.hero, styles.clock, { backgroundColor: p.bg }]}
    >
      <View style={styles.clockHeading}>
        <Text
          style={[styles.clockCity, { color: p.display }]}
          numberOfLines={2}
        >
          {location}
        </Text>
        {time.period ? (
          <Label color={p.display} style={styles.clockPeriod}>
            {time.period.toUpperCase()}
          </Label>
        ) : null}
      </View>
      <View style={[styles.clockRows, { borderColor: p.border }]}>
        {parts.map((part) => (
          <View
            key={part.unit}
            style={[
              styles.clockRow,
              // Shorter than the 0.72em cap height, so the next rule cuts the numerals.
              { borderColor: p.border, height: fontSize * 0.6 },
            ]}
          >
            <Text
              style={[
                styles.clockDigits,
                {
                  color: p.display,
                  opacity: part.opacity,
                  fontSize,
                  lineHeight: fontSize,
                  // Line box puts the cap top 0.165em down; leave a 0.04em gap.
                  marginTop: fontSize * -0.125,
                },
              ]}
            >
              {String(part.value).padStart(2, '0')}
            </Text>
            <Text style={[styles.clockUnit, { color: p.display }]}>
              {part.unit}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function Countdown({ prayer, ms }: { prayer: Prayer; ms: number }) {
  const p = useNothing()
  const total = Math.max(0, Math.floor(ms / 1000))
  const countdown = [
    String(Math.floor(total / 3600)).padStart(2, '0'),
    String(Math.floor(total / 60) % 60).padStart(2, '0'),
    String(total % 60).padStart(2, '0'),
  ].join(':')
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`${PRAYER_LABELS[prayer].en} in ${Math.floor(total / 3600)} hours ${Math.floor(total / 60) % 60} minutes`}
      style={styles.nextPrayer}
    >
      <View style={styles.next}>
        <View style={[styles.liveDot, { backgroundColor: p.accent }]} />
        <Label>{`Next · ${PRAYER_LABELS[prayer].en}`}</Label>
      </View>
      <Text style={[styles.nextDigits, { color: p.display }]}>{countdown}</Text>
    </View>
  )
}

/** Confirms an `io.raghib.gym://prayer?history=…` link from the Athan PWA. */
function HistoryImport() {
  const p = useNothing()
  const router = useRouter()
  const { history } = useLocalSearchParams<{ history?: string }>()
  const merge = usePrayerLogStore((state) => state.merge)
  const [done, setDone] = useState<number | null>(null)
  const days = useMemo(
    () =>
      typeof history === 'string' ? decodePrayerHistory(history) : undefined,
    [history],
  )
  const dismiss = () => router.setParams({ history: undefined })

  if (done !== null) {
    return <Label color={p.primary}>{`[Saved: ${done} days imported]`}</Label>
  }
  if (days === undefined) return null
  if (days === null) {
    return (
      <View style={[styles.importCard, { borderColor: p.borderVisible }]}>
        <Label color={p.accent}>[Error: this import link is not valid]</Label>
        <PillButton label="Dismiss" onPress={dismiss} />
      </View>
    )
  }
  const count = Object.keys(days).length
  return (
    <View
      testID="prayer-import"
      style={[styles.importCard, { borderColor: p.borderVisible }]}
    >
      <Label color={p.primary}>{`Import ${count} days from Athan`}</Label>
      <Text style={[styles.body, { color: p.secondary }]}>
        Adds the prayers you marked in the web app. Nothing logged here is
        removed.
      </Text>
      <View style={styles.actions}>
        <PillButton
          label="Import"
          primary
          onPress={() => {
            merge(days)
            setDone(count)
            dismiss()
          }}
        />
        <PillButton label="Cancel" onPress={dismiss} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  scene: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: Layout.gutter,
    paddingVertical: 8,
  },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingBottom: 32,
    gap: 28,
  },
  hero: { gap: 8, paddingTop: 8 },
  clockHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  clock: {
    marginHorizontal: -Layout.gutter,
    paddingHorizontal: Layout.gutter,
    paddingBottom: 8,
  },
  clockCity: {
    flex: 1,
    fontFamily: FONTS.clockLabel,
    fontSize: 20,
    lineHeight: 26,
  },
  clockPeriod: { paddingBottom: 2 },
  clockRows: { borderTopWidth: StyleSheet.hairlineWidth },
  clockRow: {
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  clockDigits: { fontFamily: FONTS.clock },
  clockUnit: {
    fontFamily: FONTS.clockLabel,
    fontSize: 15,
    paddingTop: 10,
    textAlign: 'right',
  },
  next: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  digits: {
    fontFamily: FONTS.display,
    fontSize: 96,
    lineHeight: 100,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  nextPrayer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  nextDigits: {
    fontFamily: FONTS.display,
    fontSize: 22,
    lineHeight: 28,
    fontVariant: ['tabular-nums'],
  },
  place: { gap: 10 },
  city: {
    fontFamily: FONTS.body,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  name: { flex: 1, gap: 4 },
  prayer: { fontFamily: FONTS.medium, fontSize: 17 },
  time: {
    fontFamily: FONTS.body,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  side: {
    width: 22,
    height: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  note: { lineHeight: 18, textTransform: 'none' },
  body: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 21 },
  importCard: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  nav: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
  },
})
