import { Ionicons } from '@expo/vector-icons'
import { usePreventRemove } from '@react-navigation/native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, {
  ClipPath,
  Defs,
  G,
  Line,
  Path,
  Text as SvgText,
} from 'react-native-svg'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { HealthReadState } from '@/components/health/HealthReadState'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useTheme } from '@/hooks/useThemeColor'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import type { DailyWaterReading } from '@/lib/healthSnapshot/types'
import { waterErrorMessage } from '@/lib/healthSnapshot/water'
import { waterWriter } from '@/lib/healthSnapshot/waterWriter'

const WATER_STEP_LITERS = 0.25

const HISTORY_DAYS = 28
const CHART_HEIGHT = 140
const BOTTLE_PATH =
  'M48 0 H72 Q76 0 76 4 V22 Q76 27 72 29 Q73 38 78 46 L96 76 Q104 90 104 106 V212 Q104 236 80 236 H40 Q16 236 16 212 V106 Q16 90 24 76 L42 46 Q47 38 48 29 Q44 27 44 22 V4 Q44 0 48 0 Z'
const BOTTLE_BOTTOM = 236
const BOTTLE_FILL_HEIGHT = 140
// SVG text otherwise falls back to the browser's serif font on web.
const TICK_FONT = Platform.select({ web: 'system-ui, sans-serif' })

export default function WaterScreen() {
  return (
    <HealthDateRoute>{(date) => <WaterForDate date={date} />}</HealthDateRoute>
  )
}

function useWaterHistory(date: Date) {
  const key = localDateKey(date)
  const requestRef = useRef(0)
  const [state, setState] = useState<{
    key: string
    history: DailyWaterReading[] | null
    failed: boolean
  }>({ key: '', history: null, failed: false })

  const load = useCallback(async () => {
    const request = ++requestRef.current
    try {
      const history = await healthSnapshot.getWaterHistory(date, HISTORY_DAYS)
      if (requestRef.current === request) {
        setState({ key, history, failed: false })
      }
    } catch {
      if (requestRef.current === request) {
        setState({ key, history: null, failed: true })
      }
    }
  }, [date, key])

  useEffect(() => {
    void load()
    return () => {
      requestRef.current += 1
    }
  }, [load])

  const current = state.key === key
  return {
    history: current ? state.history : null,
    failed: current && state.failed,
    load,
  }
}

function WaterForDate({ date }: { date: Date }) {
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const { history, failed, load } = useWaterHistory(date)
  const entry = useWaterEntry(date, load)
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }, [load])

  const liters = history?.[history.length - 1]?.liters ?? null
  const recorded = (history ?? []).flatMap((day) =>
    day.liters === null ? [] : [day.liters],
  )
  const scale = Math.max(1, Math.ceil(Math.max(0, ...recorded)))

  return (
    <SafeAreaView
      testID="water-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScreenHeader
        title="Water"
        subtitle={date.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            testID="water-refresh"
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.accent}
          />
        }
      >
        {!healthSnapshot.isAvailable() && (
          <Text style={[styles.note, { color: theme.subtitleText }]}>
            Demo data - Apple Health is available on iOS.
          </Text>
        )}
        {failed && !refreshing ? (
          <HealthReadState
            error="Unable to load water history"
            onRetry={onRefresh}
          />
        ) : history === null ? (
          <HealthReadState loading />
        ) : (
          <>
            <View style={styles.overview}>
              <Bottle liters={liters} scale={scale} />
              <View style={styles.reading}>
                <StepButton
                  icon="add"
                  label="Increase water amount by 250 milliliters"
                  disabled={entry.blocked !== null || entry.saving}
                  onPress={() => entry.step(WATER_STEP_LITERS)}
                />
                <Text
                  selectable
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={[styles.liters, { color: theme.text }]}
                  accessibilityLabel={
                    liters === null
                      ? 'Water unavailable'
                      : `${liters} liters of water`
                  }
                >
                  {liters === null ? '--' : liters.toFixed(1)}
                </Text>
                <Text
                  style={[Typography.bodyLg, { color: theme.subtitleText }]}
                >
                  liters
                </Text>
                {entry.draft > 0 && (
                  <Text
                    style={[Typography.bodySm, { color: theme.accent }]}
                    accessibilityLabel={`${entry.draft.toFixed(2)} liters not saved yet`}
                  >
                    +{entry.draft.toFixed(2)} L unsaved
                  </Text>
                )}
                <StepButton
                  icon="remove"
                  label="Decrease water amount by 250 milliliters"
                  disabled={
                    entry.blocked !== null || entry.saving || entry.draft <= 0
                  }
                  onPress={() => entry.step(-WATER_STEP_LITERS)}
                />
              </View>
            </View>
            {entry.blocked ? (
              <Text style={[styles.note, { color: theme.subtitleText }]}>
                {entry.blocked}
              </Text>
            ) : (
              <View style={styles.entry}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: entry.saving || entry.draft <= 0,
                    busy: entry.saving,
                  }}
                  disabled={entry.saving || entry.draft <= 0}
                  onPress={() => void entry.save()}
                  style={({ pressed }) => [
                    styles.saveButton,
                    {
                      backgroundColor: theme.accent,
                      opacity:
                        entry.saving || entry.draft <= 0
                          ? 0.5
                          : pressed
                            ? 0.75
                            : 1,
                    },
                  ]}
                >
                  {entry.saving ? (
                    <ActivityIndicator color={theme.homeBackground} />
                  ) : (
                    <Text
                      style={[
                        Typography.bodyMd,
                        { color: theme.homeBackground },
                      ]}
                    >
                      Save to Apple Health
                    </Text>
                  )}
                </Pressable>
                {entry.message && (
                  <Text
                    accessibilityRole={entry.message.error ? 'alert' : 'text'}
                    style={[
                      Typography.bodySm,
                      {
                        color: entry.message.error
                          ? theme.danger
                          : theme.subtitleText,
                      },
                    ]}
                  >
                    {entry.message.text}
                  </Text>
                )}
                <Stack.Screen
                  options={{
                    gestureEnabled: !entry.saving,
                    headerBackButtonMenuEnabled: !entry.saving,
                  }}
                />
              </View>
            )}

            <View style={styles.history}>
              <View>
                <Text
                  accessibilityRole="header"
                  style={[Typography.headingLg, { color: theme.text }]}
                >
                  Daily history
                </Text>
                <Text
                  style={[Typography.bodyMd, { color: theme.subtitleText }]}
                >
                  Last {HISTORY_DAYS} days
                </Text>
              </View>
              <HistoryBars history={history} scale={scale} />
            </View>
            <Text style={[styles.note, { color: theme.subtitleText }]}>
              Read from Apple Health. Pull down to refresh.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// The draft stays in memory; only an explicit save writes a new Health sample.
function useWaterEntry(date: Date, load: () => Promise<void>) {
  const availability = waterWriter.getAvailability()
  const today = localDateKey(date) === localDateKey(new Date())
  const blocked = !today
    ? 'Water can only be added for today.'
    : availability.available
      ? null
      : availability.message
  const [draft, setDraft] = useState(0)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    error: boolean
    text: string
  } | null>(null)
  const savingRef = useRef(false)

  usePreventRemove(saving, () => undefined)

  const step = (delta: number) => {
    setDraft((current) => Math.max(0, Number((current + delta).toFixed(2))))
    setMessage(null)
  }

  const save = async () => {
    if (savingRef.current || blocked !== null || draft <= 0) return
    savingRef.current = true
    setSaving(true)
    setMessage(null)
    try {
      await waterWriter.save({ liters: draft, measuredAt: new Date() })
      setDraft(0)
      setMessage({ error: false, text: 'Saved to Apple Health.' })
      await load()
    } catch (failure) {
      setMessage({ error: true, text: waterErrorMessage(failure) })
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  return { blocked, draft, saving, message, step, save }
}

function StepButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'add' | 'remove'
  label: string
  disabled: boolean
  onPress: () => void
}) {
  const theme = useTheme()
  const filled = icon === 'add'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stepButton,
        {
          backgroundColor: filled ? theme.text : theme.homeSurface,
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={28}
        color={filled ? theme.homeBackground : theme.text}
      />
    </Pressable>
  )
}

function Bottle({ liters, scale }: { liters: number | null; scale: number }) {
  const theme = useTheme()
  const step = scale <= 2 ? 0.5 : 1
  const ticks = Array.from(
    { length: Math.round(scale / step) },
    (_, index) => (index + 1) * step,
  )
  const levelY = (value: number) =>
    BOTTLE_BOTTOM - (BOTTLE_FILL_HEIGHT * value) / scale
  const surface = liters === null || liters <= 0 ? null : levelY(liters)

  return (
    <View
      testID="water-bottle"
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.bottle}
    >
      <Svg width="100%" height="100%" viewBox="-36 0 144 240">
        <Defs>
          <ClipPath id="water-bottle-clip">
            <Path d={BOTTLE_PATH} />
          </ClipPath>
        </Defs>
        <Path d={BOTTLE_PATH} fill={theme.homeSurface} />
        {surface !== null && (
          <G clipPath="url(#water-bottle-clip)">
            <Path
              testID="water-bottle-liquid"
              d={`M0 ${surface} Q60 ${surface + 8} 120 ${surface} V240 H0 Z`}
              fill={theme.metricHydration}
            />
          </G>
        )}
        {ticks.map((tick) => {
          const y = levelY(tick)
          return (
            <G key={tick}>
              <Line
                x1={4}
                x2={13}
                y1={y}
                y2={y}
                stroke={theme.subtitleText}
                strokeWidth={1}
              />
              <SvgText
                x={-1}
                y={y + 3.5}
                fontSize={10}
                fontFamily={TICK_FONT}
                textAnchor="end"
                fill={theme.subtitleText}
              >
                {`${tick} L`}
              </SvgText>
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

function HistoryBars({
  history,
  scale,
}: {
  history: DailyWaterReading[]
  scale: number
}) {
  const theme = useTheme()
  const recorded = history.filter((day) => day.liters !== null)
  const highest = Math.max(0, ...recorded.map((day) => day.liters ?? 0))
  const label =
    recorded.length === 0
      ? `No water recorded in the last ${history.length} days`
      : `Water recorded on ${recorded.length} of ${history.length} days, highest ${highest} liters`
  const shortDate = (key: string) =>
    new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })

  return (
    <View>
      <View
        testID="water-history"
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        style={styles.chart}
      >
        {history.map((day, index) => {
          const selected = index === history.length - 1
          return (
            <View key={day.date} style={styles.barSlot}>
              {day.liters === null ? (
                <View
                  testID={`water-day-${day.date}-missing`}
                  style={[styles.dot, { backgroundColor: theme.separator }]}
                />
              ) : (
                <View
                  testID={`water-day-${day.date}`}
                  style={[
                    styles.bar,
                    {
                      height: Math.max(3, (CHART_HEIGHT * day.liters) / scale),
                      backgroundColor: theme.metricHydration,
                      opacity: selected ? 1 : 0.45,
                    },
                  ]}
                />
              )}
            </View>
          )
        })}
      </View>
      <View style={styles.axis}>
        <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
          {shortDate(history[0].date)}
        </Text>
        <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
          {shortDate(history[history.length - 1].date)}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingBottom: Spacing.xxxl,
    gap: Spacing.xl,
  },
  overview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.gutter,
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  bottle: { width: 156, height: 260 },
  reading: { flex: 1, alignItems: 'center', gap: Spacing.sm },
  liters: {
    ...Typography.displayLg,
    fontVariant: ['tabular-nums'],
  },
  history: { paddingHorizontal: Layout.gutter, gap: Spacing.lg },
  chart: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  barSlot: { flex: 1, alignItems: 'center' },
  bar: { width: '100%', maxWidth: 8, borderRadius: Radii.pill },
  dot: { width: 4, height: 4, borderRadius: Radii.pill },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  note: { ...Typography.bodySm, marginHorizontal: Layout.gutter },
  entry: { marginHorizontal: Layout.gutter, gap: Spacing.sm },
  stepButton: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    minHeight: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
})
