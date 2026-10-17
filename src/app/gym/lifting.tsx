import { Ionicons } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import React, { useMemo, useState } from 'react'
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ScreenHeader } from '@/components/common/ScreenHeader'
import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { ExerciseInfoButton } from '@/components/gym/ExerciseInfoSheet'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useTheme } from '@/hooks/useThemeColor'
import {
  exerciseHistory,
  findProgrammeDay,
  PROGRAMME,
  programmeDayFor,
  type ExerciseSession,
  type ProgrammeDay,
  type ProgrammeExercise,
} from '@/lib/gymProgramme'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import {
  isValidSet,
  MAX_REPS,
  useGymLogStore,
  type GymDayLog,
  type LoggedSet,
} from '@/stores/GymLogStore'

// To Failure exercises show five set rows; extra sets add rows past it.
const FAILURE_ROWS = 5
const pad = (n: number) => String(n).padStart(2, '0')

export default function LiftingScreen() {
  return (
    <HealthDateRoute>
      {(date) => <LiftingForDate date={date} />}
    </HealthDateRoute>
  )
}

function LiftingForDate({ date }: { date: Date }) {
  const theme = useTheme()
  const colorScheme = useColorScheme()
  const dateKey = localDateKey(date)
  const programmeStart = useGymLogStore((s) => s.programmeStart)
  const log = useGymLogStore((s) => s.logs[dateKey])
  const startProgramme = useGymLogStore((s) => s.startProgramme)

  // A saved log keeps its programme day even if the start date changes later.
  const scheduled =
    !log && programmeStart ? programmeDayFor(programmeStart, dateKey) : null
  const day: ProgrammeDay | null = log
    ? findProgrammeDay(log.day)
    : scheduled && 'day' in scheduled
      ? scheduled.day
      : null
  const outside = scheduled && 'reason' in scheduled ? scheduled.reason : null

  const dateLabel = date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const confirmStart = () => {
    const begin = () => startProgramme(dateKey)
    if (!programmeStart) return begin()
    Alert.alert(
      'Restart programme?',
      `${dateLabel} becomes day 1. Saved workouts keep their logged days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restart', style: 'destructive', onPress: begin },
      ],
    )
  }

  return (
    <SafeAreaView
      testID="gym-lifting-screen"
      style={[styles.container, { backgroundColor: theme.homeBackground }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <ScreenHeader title="Lifting" subtitle={dateLabel} />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <Band
          title={
            day ? `Week ${day.week} · Day ${pad(Number(day.day))}` : 'Lifting'
          }
        />
        {!programmeStart && !log ? (
          <View style={styles.block}>
            <Text style={[Typography.bodyMd, { color: theme.text }]}>
              {Math.ceil(PROGRAMME.length / 7)}-week programme ·{' '}
              {PROGRAMME.length} days
            </Text>
            <ActionButton
              testID="gym-start-programme"
              label={`Start day 1 on ${dateLabel}`}
              onPress={confirmStart}
            />
          </View>
        ) : day ? (
          <LiftingDay key={day.day} day={day} dateKey={dateKey} log={log} />
        ) : (
          <View style={styles.block}>
            <Text style={[Typography.bodyMd, { color: theme.text }]}>
              {outside === 'before-start'
                ? 'Before your programme starts.'
                : 'Programme complete.'}
            </Text>
          </View>
        )}
        {programmeStart && !log && (
          <Pressable
            accessibilityRole="button"
            onPress={confirmStart}
            style={styles.restart}
          >
            <Text style={[styles.mono, { color: theme.subtitleText }]}>
              Restart programme on this day
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function LiftingDay({
  day,
  dateKey,
  log,
}: {
  day: ProgrammeDay
  dateKey: string
  log: GymDayLog | undefined
}) {
  const theme = useTheme()
  const [active, setActive] = useState(0)
  const exercise = day.exercises[active]
  return (
    <>
      <View style={styles.titleRow}>
        <Text
          style={[Typography.headingSm, styles.flex, { color: theme.text }]}
        >
          {day.title}
        </Text>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Watch ${day.title} video`}
          onPress={() => {
            Linking.openURL(day.videoURL).catch(() =>
              Alert.alert("Couldn't open the video"),
            )
          }}
          hitSlop={8}
        >
          <Ionicons
            name="play-circle-outline"
            size={32}
            color={theme.goalComplete}
          />
        </Pressable>
      </View>
      {exercise === undefined ? (
        <View style={styles.block}>
          <Text style={[Typography.bodyMd, { color: theme.text }]}>
            Active rest day. Cardio only.
          </Text>
        </View>
      ) : (
        <>
          <ExerciseFocus
            key={exercise.id}
            index={active}
            total={day.exercises.length}
            exercise={exercise}
            dateKey={dateKey}
            day={day.day}
            logged={log?.sets[exercise.id] ?? []}
            locked={Boolean(log?.finishedAt)}
            onMove={(step) =>
              setActive((current) =>
                Math.min(day.exercises.length - 1, Math.max(0, current + step)),
              )
            }
          />
          {/* ponytail: the day is "complete" once its final exercise has a set. */}
          {(log?.finishedAt ||
            (log?.sets[day.exercises[day.exercises.length - 1].id]?.length ??
              0) > 0) && <FinishCard dateKey={dateKey} log={log} />}
        </>
      )}
    </>
  )
}

const formatKg = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1)

const shortDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })

function ExerciseFocus({
  index,
  total,
  exercise,
  dateKey,
  day,
  logged,
  locked,
  onMove,
}: {
  index: number
  total: number
  exercise: ProgrammeExercise
  dateKey: string
  day: string
  logged: LoggedSet[]
  locked: boolean
  onMove: (step: number) => void
}) {
  const theme = useTheme()
  const logSet = useGymLogStore((s) => s.logSet)
  const removeLastSet = useGymLogStore((s) => s.removeLastSet)
  const logs = useGymLogStore((s) => s.logs)
  const [panel, setPanel] = useState<'previous' | 'max' | null>(null)
  const [reps, setReps] = useState(String(exercise.reps))
  const [kg, setKg] = useState(() => {
    const last = logged.at(-1)?.kilograms
    return last == null ? '' : String(last)
  })
  const history = useMemo(
    () => exerciseHistory(logs, exercise.title, dateKey),
    [logs, exercise.title, dateKey],
  )

  const entry = {
    reps: reps.trim() === '' ? Number.NaN : Number(reps),
    kilograms: kg.trim() === '' ? null : Number(kg.replace(',', '.')),
  }
  const valid = isValidSet(entry)
  const target = typeof exercise.sets === 'number' ? exercise.sets : null
  const rowCount = target
    ? Math.max(target, logged.length)
    : Math.max(FAILURE_ROWS, logged.length + (locked ? 0 : 1))
  const setBand = locked
    ? `${logged.length} ${logged.length === 1 ? 'set' : 'sets'} logged`
    : target !== null && logged.length >= target
      ? `All ${target} sets done`
      : `Set: ${logged.length + 1}${target ? ` of ${target}` : ''}`
  const togglePanel = (next: 'previous' | 'max') =>
    setPanel((current) => (current === next ? null : next))

  return (
    <View
      testID={`gym-exercise-${exercise.id}`}
      style={[styles.card, { borderColor: theme.goalTrack }]}
    >
      <View style={[styles.focusHeader, { backgroundColor: theme.goalTrack }]}>
        <View style={[styles.badge, { backgroundColor: theme.goalComplete }]}>
          <Text style={[styles.badgeText, { color: theme.goalOnComplete }]}>
            {index + 1}
          </Text>
        </View>
        <View style={styles.flex}>
          <Text style={[styles.focusTitle, { color: theme.text }]}>
            {exercise.title}
          </Text>
          <Text style={[styles.mono, { color: theme.subtitleText }]}>
            {target ? `Target sets: ${target}` : 'Sets: to failure'}
          </Text>
          <Text style={[styles.mono, { color: theme.subtitleText }]}>
            {target
              ? `${target * exercise.reps} total reps`
              : `${exercise.reps} reps per set`}
          </Text>
        </View>
        <ExerciseInfoButton title={exercise.title} />
      </View>
      <View style={[styles.setBand, { backgroundColor: theme.goalComplete }]}>
        <Text
          style={[styles.mono, styles.bold, { color: theme.goalOnComplete }]}
        >
          {setBand}
        </Text>
      </View>

      <View style={styles.cardBody}>
        {!locked && (
          <>
            <View style={styles.entryRow}>
              <View style={[styles.flex, styles.entryTarget]}>
                <Text style={[styles.mono, { color: theme.text }]}>
                  Target reps: {exercise.reps}
                </Text>
                <View
                  style={[styles.chip, { backgroundColor: theme.goalTrack }]}
                >
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.mono,
                      styles.chipText,
                      { color: theme.subtitleText },
                    ]}
                  >
                    {exercise.variation ?? 'Standard set'}
                  </Text>
                </View>
              </View>
              <EntryBox
                testID={`gym-kg-${exercise.id}`}
                accessibilityLabel={`${exercise.title} weight in kilograms`}
                value={kg}
                onChangeText={setKg}
                keyboardType="decimal-pad"
                placeholder="BW"
                label="kg"
              />
              <Text style={[styles.times, { color: theme.subtitleText }]}>
                ×
              </Text>
              <EntryBox
                testID={`gym-reps-${exercise.id}`}
                accessibilityLabel={`${exercise.title} reps`}
                value={reps}
                onChangeText={setReps}
                keyboardType="number-pad"
                placeholder="--"
                label="reps"
              />
            </View>
            <ActionButton
              testID={`gym-save-set-${exercise.id}`}
              label="Save set"
              disabled={!valid}
              onPress={() => logSet(dateKey, day, exercise.id, entry)}
            />
            {!valid && (
              <Text style={[Typography.bodySm, { color: theme.danger }]}>
                Reps 1-{MAX_REPS}. Weight above 0 kg, or blank for body weight.
              </Text>
            )}
          </>
        )}

        {Array.from({ length: rowCount }, (_, i) => {
          const set = logged[i]
          const isNext = i === logged.length
          return (
            <View
              key={i}
              style={[
                styles.setRow,
                {
                  borderTopColor: theme.goalTrack,
                  opacity: set || isNext ? 1 : 0.4,
                },
              ]}
            >
              <Ionicons
                name={set ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={set ? theme.goalComplete : theme.subtitleText}
              />
              <Text
                numberOfLines={1}
                style={[styles.mono, styles.flex, { color: theme.text }]}
              >
                Set {pad(i + 1)}{' '}
                <Text style={{ color: theme.goalComplete }}>///</Text>{' '}
                {exercise.variation ?? 'Standard set'}
              </Text>
              <Text style={[styles.mono, { color: theme.text }]}>
                {set
                  ? `${set.reps} × ${set.kilograms === null ? 'BW' : `${formatKg(set.kilograms)} kg`}`
                  : `Target ${exercise.reps}`}
              </Text>
              {set && i === logged.length - 1 && !locked ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Undo last ${exercise.title} set`}
                  onPress={() => removeLastSet(dateKey, exercise.id)}
                  hitSlop={10}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={theme.subtitleText}
                  />
                </Pressable>
              ) : null}
            </View>
          )
        })}
      </View>

      {panel === 'previous' && (
        <PreviousPanel
          session={history.filter((s) => s.dateKey < dateKey).at(-1)}
        />
      )}
      {panel === 'max' && (
        <OneRepMaxPanel
          history={history}
          today={history.find((s) => s.dateKey === dateKey)?.oneRepMax ?? null}
        />
      )}

      <View style={[styles.toolbar, { borderTopColor: theme.goalTrack }]}>
        <ToolButton
          icon="chevron-back"
          label="Back"
          accessibilityLabel="Previous exercise"
          disabled={index === 0}
          onPress={() => onMove(-1)}
        />
        <ToolButton
          icon="time-outline"
          label="Last time"
          active={panel === 'previous'}
          onPress={() => togglePanel('previous')}
        />
        <ToolButton
          icon="stats-chart-outline"
          label="1 rep max"
          active={panel === 'max'}
          onPress={() => togglePanel('max')}
        />
        <ToolButton
          icon="chevron-forward"
          label={`${index + 1}/${total}`}
          accessibilityLabel="Next exercise"
          disabled={index === total - 1}
          onPress={() => onMove(1)}
        />
      </View>
    </View>
  )
}

function EntryBox({
  label,
  ...input
}: {
  label: string
  testID: string
  accessibilityLabel: string
  value: string
  onChangeText: (value: string) => void
  keyboardType: 'decimal-pad' | 'number-pad'
  placeholder: string
}) {
  const theme = useTheme()
  return (
    <View style={styles.entry}>
      <TextInput
        {...input}
        maxLength={6}
        placeholderTextColor={theme.subtitleText}
        style={[
          styles.entryInput,
          { color: theme.text, borderColor: theme.goalTrack },
        ]}
      />
      <Text
        style={[styles.mono, styles.entryLabel, { color: theme.subtitleText }]}
      >
        {label}
      </Text>
    </View>
  )
}

function ToolButton({
  icon,
  label,
  onPress,
  active = false,
  disabled = false,
  accessibilityLabel,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  onPress: () => void
  active?: boolean
  disabled?: boolean
  accessibilityLabel?: string
}) {
  const theme = useTheme()
  const color = active ? theme.goalComplete : theme.subtitleText
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tool, { opacity: disabled ? 0.35 : 1 }]}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.mono, styles.toolLabel, { color }]}>{label}</Text>
    </Pressable>
  )
}

function PreviousPanel({ session }: { session: ExerciseSession | undefined }) {
  const theme = useTheme()
  return (
    <View style={[styles.panel, { borderTopColor: theme.goalTrack }]}>
      <Text style={[styles.mono, styles.bold, { color: theme.text }]}>
        Last time{session ? ` · ${shortDate(session.dateKey)}` : ''}
      </Text>
      {session ? (
        session.sets.map((set, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.mono, { color: theme.subtitleText }]}>
              Set {pad(i + 1)}
            </Text>
            <Text style={[styles.mono, { color: theme.text }]}>
              {set.reps} ×{' '}
              {set.kilograms === null ? 'BW' : `${formatKg(set.kilograms)} kg`}
            </Text>
          </View>
        ))
      ) : (
        <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
          No earlier session for this exercise.
        </Text>
      )}
    </View>
  )
}

function OneRepMaxPanel({
  history,
  today,
}: {
  history: ExerciseSession[]
  today: number | null
}) {
  const theme = useTheme()
  const points = history
    .filter(
      (s): s is ExerciseSession & { oneRepMax: number } => s.oneRepMax !== null,
    )
    .slice(-6)
  const top = Math.max(1, ...points.map((p) => p.oneRepMax))
  return (
    <View
      testID="gym-one-rep-max"
      style={[styles.panel, { borderTopColor: theme.goalTrack }]}
    >
      <Text style={[styles.mono, styles.bold, { color: theme.text }]}>
        Calculated one rep max{' '}
        <Text style={{ color: theme.goalComplete }}>
          | {today === null ? '--' : `${formatKg(today)} kg`}
        </Text>
      </Text>
      {points.length === 0 ? (
        <Text style={[Typography.bodySm, { color: theme.subtitleText }]}>
          Save a weighted set to estimate your one rep max.
        </Text>
      ) : (
        <>
          <View style={styles.chart}>
            {points.map((p) => (
              <View
                key={p.dateKey}
                accessible
                accessibilityLabel={`${shortDate(p.dateKey)}: ${formatKg(p.oneRepMax)} kg`}
                style={styles.barColumn}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(p.oneRepMax / top) * 100}%`,
                        backgroundColor: theme.goalComplete,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.barValue, { color: theme.goalOnComplete }]}
                    >
                      {Math.round(p.oneRepMax)}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.mono,
                    styles.toolLabel,
                    { color: theme.subtitleText },
                  ]}
                >
                  {shortDate(p.dateKey)}
                </Text>
              </View>
            ))}
          </View>
          {[...points].reverse().map((p) => (
            <View
              key={p.dateKey}
              style={[styles.tableRow, { borderTopColor: theme.goalTrack }]}
            >
              <Text style={[styles.mono, { color: theme.subtitleText }]}>
                {shortDate(p.dateKey)}
              </Text>
              <Text style={[styles.mono, { color: theme.text }]}>
                {formatKg(p.oneRepMax)} kg
              </Text>
            </View>
          ))}
          <Text
            style={[
              styles.mono,
              styles.toolLabel,
              { color: theme.subtitleText },
            ]}
          >
            Epley estimate from your best weighted set
          </Text>
        </>
      )}
    </View>
  )
}

function FinishCard({
  dateKey,
  log,
}: {
  dateKey: string
  log: GymDayLog | undefined
}) {
  const theme = useTheme()
  const finishWorkout = useGymLogStore((s) => s.finishWorkout)
  const [rating, setRating] = useState(7)
  const setCount = Object.values(log?.sets ?? {}).reduce(
    (sum, sets) => sum + sets.length,
    0,
  )

  if (log?.finishedAt) {
    const finished = new Date(log.finishedAt)
    return (
      <View
        testID="gym-finished"
        style={[styles.block, { backgroundColor: theme.goalComplete }]}
      >
        <Text style={[styles.mono, { color: theme.goalOnComplete }]}>
          Finished{' '}
          {finished.toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })}{' '}
          · {setCount} {setCount === 1 ? 'set' : 'sets'} · rated {log.rating}/10
        </Text>
      </View>
    )
  }

  return (
    <View style={[styles.card, { borderColor: theme.goalTrack }]}>
      <View style={styles.cardBody}>
        <Text style={[styles.mono, styles.center, { color: theme.text }]}>
          Rate this workout
        </Text>
        <View style={styles.center}>
          <Stepper
            label="Rating"
            value={rating}
            onChange={(next) => setRating(Math.min(10, Math.max(1, next)))}
          />
        </View>
        <ActionButton
          testID="gym-finish"
          label={setCount ? 'Finish workout' : 'Save a set to finish'}
          disabled={setCount === 0}
          onPress={() =>
            finishWorkout(dateKey, { rating, finishedAt: new Date() })
          }
        />
      </View>
    </View>
  )
}

function Band({ title }: { title: string }) {
  const theme = useTheme()
  return (
    <View
      accessibilityRole="header"
      style={[styles.band, { borderBottomColor: theme.goalComplete }]}
    >
      <Text style={[styles.mono, { color: theme.text }]}>{title}</Text>
    </View>
  )
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (next: number) => void
}) {
  const theme = useTheme()
  const button = (icon: 'add' | 'remove') => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${icon === 'add' ? 'Increase' : 'Decrease'} ${label.toLowerCase()}`}
      onPress={() => onChange(value + (icon === 'add' ? 1 : -1))}
      style={[styles.stepButton, { borderColor: theme.goalTrack }]}
    >
      <Ionicons name={icon} size={18} color={theme.text} />
    </Pressable>
  )
  return (
    <View style={styles.stepper}>
      {button('remove')}
      <View
        accessible
        accessibilityLabel={`${label} ${value}`}
        style={styles.stepValue}
      >
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.mono, { color: theme.subtitleText }]}>
          {label}
        </Text>
      </View>
      {button('add')}
    </View>
  )
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  testID,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  testID?: string
}) {
  const theme = useTheme()
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: disabled ? theme.goalTrack : theme.goalComplete,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.mono,
          { color: disabled ? theme.subtitleText : theme.goalOnComplete },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: Layout.gutter,
    paddingBottom: Spacing.xxl,
    gap: Spacing.sm,
  },
  flex: { flex: 1 },
  center: { alignSelf: 'center', textAlign: 'center' },
  mono: {
    fontFamily: 'SpaceMono',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontVariant: ['tabular-nums'],
  },
  band: {
    marginTop: Spacing.xs,
    paddingBottom: Spacing.xxs,
    borderBottomWidth: 2,
  },
  statValue: {
    fontFamily: 'SpaceMono',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  block: { gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radii.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  restart: { alignSelf: 'center', padding: Spacing.sm },
  card: { borderWidth: 2, borderRadius: Radii.md, overflow: 'hidden' },
  cardBand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  cardBody: { padding: Spacing.sm, gap: Spacing.xs },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingTop: Spacing.xxs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  stepButton: {
    width: 38,
    height: 38,
    borderWidth: 2,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { alignItems: 'center', minWidth: 40 },
  action: {
    flex: 1,
    minHeight: Layout.controlSize,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
  },
  bold: { fontWeight: '700' },
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: 'SpaceMono', fontSize: 14, fontWeight: '700' },
  focusTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  setBand: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs },
  entryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.xs },
  entryTarget: { gap: Spacing.xxs },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  chipText: { fontSize: 10 },
  entry: { alignItems: 'center', gap: 2 },
  entryInput: {
    width: 64,
    height: 44,
    borderWidth: 2,
    borderRadius: Radii.sm,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
    fontSize: 18,
  },
  entryLabel: { fontSize: 9 },
  times: { fontFamily: 'SpaceMono', fontSize: 18, lineHeight: 44 },
  toolbar: { flexDirection: 'row', borderTopWidth: 2 },
  tool: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  toolLabel: { fontSize: 9, letterSpacing: 0.8 },
  panel: {
    padding: Spacing.sm,
    gap: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  chart: { flexDirection: 'row', gap: Spacing.xs, height: 128 },
  barColumn: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  barTrack: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  bar: {
    minHeight: 18,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    alignItems: 'center',
    paddingTop: 2,
  },
  barValue: { fontFamily: 'SpaceMono', fontSize: 10 },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.xxs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
