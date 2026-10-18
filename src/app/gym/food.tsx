import { Ionicons } from '@expo/vector-icons'
import { usePreventRemove } from '@react-navigation/native'
import { Stack } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { ActivityScreen } from '@/components/gym/ActivityDetail'
import { FoodBudgetCard } from '@/components/gym/FoodBudgetCard'
import { ChipTabs, FoodWeekCard } from '@/components/gym/FoodWeekCard'
import {
  foodEmoji,
  macroTargets,
  mealSlot,
  workoutKcal,
  type MealSlot,
} from '@/components/gym/activities'
import { HealthDateRoute } from '@/components/health/HealthDateRoute'
import { HealthReadState } from '@/components/health/HealthReadState'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useHealthSnapshot } from '@/hooks/useHealthSnapshot'
import { useTheme } from '@/hooks/useThemeColor'
import { healthSnapshot } from '@/lib/healthSnapshot/HealthSnapshotSource'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { foodErrorMessage, type FoodEntry } from '@/lib/healthSnapshot/food'
import { foodWriter } from '@/lib/healthSnapshot/foodWriter'
import type {
  DailyFoodLog,
  DailyHealthSnapshot,
} from '@/lib/healthSnapshot/types'
import { estimateMealPhoto, mealPhotoErrorMessage } from '@/lib/mealPhoto'
import { useThemeStore } from '@/stores/ThemeStore'

const GOAL_STEP_KCAL = 50
const GOAL_MIN_KCAL = 1200
const GOAL_MAX_KCAL = 4000
const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner', 'Snacks']
const VIEWS = ['Today', 'Week'] as const

export default function FoodScreen() {
  return (
    <HealthDateRoute>{(date) => <FoodForDate date={date} />}</HealthDateRoute>
  )
}

// Rereads whenever `refreshSnapshot` changes, keeping the log in step with Health.
function useFoodLog(date: Date, refreshSnapshot: DailyHealthSnapshot | null) {
  const key = localDateKey(date)
  const requestRef = useRef(0)
  const [state, setState] = useState<{
    key: string
    log: DailyFoodLog | null
    failed: boolean
  }>({ key: '', log: null, failed: false })

  const load = useCallback(async () => {
    const request = ++requestRef.current
    setState((prev) => (prev.failed ? { ...prev, failed: false } : prev))
    try {
      const log = await healthSnapshot.getFoodLog(date)
      if (requestRef.current === request) setState({ key, log, failed: false })
    } catch {
      if (requestRef.current === request) {
        setState({ key, log: null, failed: true })
      }
    }
  }, [date, key])

  useEffect(() => {
    void load()
    return () => {
      requestRef.current += 1
    }
  }, [load, refreshSnapshot])

  const current = state.key === key
  return {
    log: current ? state.log : null,
    failed: current && state.failed,
    load,
  }
}

// The estimate stays in memory; only an explicit save writes to Apple Health.
function useMealPhoto(date: Date, reload: () => Promise<unknown>) {
  const availability = foodWriter.getAvailability()
  const today = localDateKey(date) === localDateKey(new Date())
  const blocked = !today
    ? 'Meals can only be added for today.'
    : availability.available
      ? null
      : availability.message
  const [draft, setDraft] = useState<FoodEntry | null>(null)
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null)
  const [message, setMessage] = useState<{
    error: boolean
    text: string
  } | null>(null)
  const busyRef = useRef(false)

  usePreventRemove(busy === 'saving', () => undefined)

  const read = async (source: 'camera' | 'library') => {
    if (busyRef.current || blocked !== null) return
    busyRef.current = true
    setBusy('reading')
    setMessage(null)
    try {
      const estimate = await estimateMealPhoto(source)
      if (estimate) setDraft(estimate)
    } catch (failure) {
      setMessage({ error: true, text: mealPhotoErrorMessage(failure) })
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  const save = async () => {
    if (busyRef.current || blocked !== null || draft === null) return
    busyRef.current = true
    setBusy('saving')
    setMessage(null)
    try {
      await foodWriter.save(draft)
      setDraft(null)
      setMessage({ error: false, text: 'Saved to Apple Health.' })
      await reload()
    } catch (failure) {
      setMessage({ error: true, text: foodErrorMessage(failure) })
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  const discard = () => {
    setDraft(null)
    setMessage(null)
  }

  return { blocked, draft, busy, message, read, save, discard }
}

function FoodForDate({ date }: { date: Date }) {
  const theme = useTheme()
  const { snapshot, refresh } = useHealthSnapshot(date)
  const { log, failed, load } = useFoodLog(date, snapshot)
  const goal = useThemeStore((s) => s.foodGoalKcal)
  const setGoal = useThemeStore((s) => s.setFoodGoalKcal)
  const reload = useCallback(
    () => Promise.all([load(), refresh()]),
    [load, refresh],
  )
  const entry = useMealPhoto(date, reload)
  const [view, setView] = useState<(typeof VIEWS)[number]>('Today')

  const exercise = workoutKcal(snapshot)
  const eaten = snapshot?.dietaryCalories
  const targets = macroTargets(goal, exercise, snapshot?.bodyMassKg ?? null)
  const body = [Typography.bodyMd, { color: theme.text }]
  const muted = [Typography.bodyMd, { color: theme.subtitleText }]

  return (
    <ActivityScreen testID="gym-food-screen" title="Food" date={date}>
      <Stack.Screen
        options={{
          gestureEnabled: entry.busy !== 'saving',
          headerBackButtonMenuEnabled: entry.busy !== 'saving',
        }}
      />
      <ChipTabs options={VIEWS} selected={view} onSelect={setView} />
      {view === 'Week' ? (
        <FoodWeekCard date={date} refreshSnapshot={snapshot} />
      ) : (
        <>
          <FoodBudgetCard
            goalKcal={goal}
            eatenKcal={eaten == null ? null : Math.round(eaten)}
            exerciseKcal={exercise}
            grams={{
              protein: log?.proteinGrams ?? null,
              carbs: log?.carbsGrams ?? null,
              fat: log?.fatGrams ?? null,
            }}
            targets={targets}
          />

          <View style={styles.section}>
            <Text style={[Typography.headingSm, { color: theme.text }]}>
              Workout support
            </Text>
            <Text style={muted}>
              {exercise
                ? `Workouts add ${exercise} kcal to your budget, as extra carbs to refuel.`
                : 'Workout calories from Apple Health are added to your budget as carbs.'}
            </Text>
            <Text style={muted}>
              {targets.protein === null
                ? 'Log a weigh-in to get a protein target for lifting.'
                : 'Protein target: 1.6 g per kg of body weight for lifting.'}
            </Text>
          </View>

          {entry.blocked ? (
            <Text style={[styles.section, muted]}>{entry.blocked}</Text>
          ) : (
            <View style={styles.section}>
              {entry.busy === 'reading' ? (
                <View style={styles.reading} accessibilityLiveRegion="polite">
                  <ActivityIndicator color={theme.accent} />
                  <Text style={muted}>
                    Estimating calories on this iPhone...
                  </Text>
                </View>
              ) : entry.draft ? (
                <View
                  testID="food-estimate"
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.homeBackground,
                      borderColor: theme.goalTrack,
                    },
                  ]}
                >
                  <View style={styles.row}>
                    <FoodEmoji name={entry.draft.name} size={32} />
                    <Text
                      style={[
                        Typography.headingMd,
                        styles.name,
                        { color: theme.text },
                      ]}
                    >
                      {entry.draft.name}
                    </Text>
                  </View>
                  <Text style={body}>{entry.draft.kcal} kcal</Text>
                  <Text style={muted}>
                    Protein {entry.draft.proteinGrams} g · Carbs{' '}
                    {entry.draft.carbsGrams} g · Fat {entry.draft.fatGrams} g
                  </Text>
                  <Text style={muted}>
                    {mealSlot(entry.draft.eatenAt)} ·{' '}
                    {entry.draft.eatenAt.toLocaleTimeString(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                  <Text
                    style={[Typography.bodySm, { color: theme.subtitleText }]}
                  >
                    Estimated on this iPhone from the photo.
                  </Text>
                  <ActionButton
                    label="Save to Apple Health"
                    busy={entry.busy === 'saving'}
                    disabled={entry.busy !== null}
                    onPress={() => void entry.save()}
                  />
                  <ActionButton
                    label="Discard"
                    secondary
                    disabled={entry.busy !== null}
                    onPress={entry.discard}
                  />
                </View>
              ) : (
                <>
                  <ActionButton
                    testID="food-snap"
                    label="Snap meal"
                    disabled={entry.busy !== null}
                    onPress={() => void entry.read('camera')}
                  />
                  <ActionButton
                    label="Choose photo"
                    secondary
                    disabled={entry.busy !== null}
                    onPress={() => void entry.read('library')}
                  />
                </>
              )}
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
            </View>
          )}

          <View style={styles.section}>
            {failed ? (
              <HealthReadState
                error="Unable to load meals"
                onRetry={() => void load()}
              />
            ) : log === null ? (
              <HealthReadState loading />
            ) : log.meals.length === 0 ? (
              <Text style={muted}>No meals in Apple Health for this day.</Text>
            ) : (
              SLOTS.map((slot) => {
                const meals = log.meals.filter(
                  (meal) => mealSlot(new Date(meal.startISO)) === slot,
                )
                if (meals.length === 0) return null
                return (
                  <View
                    key={slot}
                    testID={`food-slot-${slot}`}
                    style={styles.group}
                  >
                    <View style={styles.row}>
                      <Text
                        style={[Typography.headingSm, { color: theme.text }]}
                      >
                        {slot}
                      </Text>
                      <Text style={muted}>
                        {meals.reduce((sum, meal) => sum + meal.kcal, 0)} kcal
                      </Text>
                    </View>
                    {meals.map((meal, index) => (
                      <View
                        key={`${meal.startISO}-${index}`}
                        style={styles.row}
                      >
                        <FoodEmoji name={meal.name} size={24} />
                        <Text style={[body, styles.name]} numberOfLines={1}>
                          {meal.name ?? 'Food'}
                        </Text>
                        <Text style={muted}>{meal.kcal}</Text>
                      </View>
                    ))}
                  </View>
                )
              })
            )}
          </View>

          <View style={[styles.row, styles.section]}>
            <View>
              <Text style={[Typography.headingSm, { color: theme.text }]}>
                Daily goal
              </Text>
              <Text style={muted}>{goal} kcal before workouts</Text>
            </View>
            <View style={styles.stepper}>
              <StepButton
                icon="remove"
                label="Lower daily goal by 50 kcal"
                disabled={goal <= GOAL_MIN_KCAL}
                onPress={() =>
                  setGoal(Math.max(GOAL_MIN_KCAL, goal - GOAL_STEP_KCAL))
                }
              />
              <StepButton
                icon="add"
                label="Raise daily goal by 50 kcal"
                disabled={goal >= GOAL_MAX_KCAL}
                onPress={() =>
                  setGoal(Math.min(GOAL_MAX_KCAL, goal + GOAL_STEP_KCAL))
                }
              />
            </View>
          </View>
        </>
      )}
    </ActivityScreen>
  )
}

function FoodEmoji({ name, size }: { name: string | null; size: number }) {
  return (
    <Text
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ fontSize: size, lineHeight: Math.round(size * 1.25) }}
    >
      {foodEmoji(name)}
    </Text>
  )
}

function ActionButton({
  testID,
  label,
  secondary = false,
  busy = false,
  disabled,
  onPress,
}: {
  testID?: string
  label: string
  secondary?: boolean
  busy?: boolean
  disabled: boolean
  onPress: () => void
}) {
  const theme = useTheme()
  const color = secondary ? theme.text : theme.goalOnComplete
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? theme.homeSurface : theme.goalComplete,
          opacity: disabled && !busy ? 0.5 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.label, { color }]}>{label}</Text>
      )}
    </Pressable>
  )
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.stepButton,
        {
          backgroundColor: theme.homeSurface,
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={22} color={theme.text} />
    </Pressable>
  )
}

const styles = StyleSheet.create({
  section: { alignSelf: 'stretch', gap: Spacing.xs },
  reading: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.md },
  card: {
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  group: { gap: Spacing.xxs, paddingVertical: Spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  name: { flex: 1 },
  stepper: { flexDirection: 'row', gap: Spacing.xs },
  stepButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  label: {
    fontFamily: 'SpaceMono',
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
})
