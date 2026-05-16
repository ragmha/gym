import { CircularProgress } from '@/components/common/CircularProgress'
import { SegmentedTabs } from '@/components/ui/SegmentedTabs'
import Workout from '@/components/workout/Workout'
import { useTheme } from '@/hooks/useThemeColor'
import { useExerciseStore } from '@/stores/ExerciseStore'
import {
  completedSetCount,
  totalSetCount,
  useWorkoutSessionStoreBase,
} from '@/stores/WorkoutSessionStore'
import type { WorkoutTemplate } from '@/types/models'
import Ionicons from '@expo/vector-icons/Ionicons'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useMemo, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function WorkoutsScreen() {
  const { exercises } = useExerciseStore()
  const sessions = useWorkoutSessionStoreBase((state) => state.sessions)
  const insets = useSafeAreaInsets()

  const [tab, setTab] = useState<'active' | 'completed'>('active')

  const {
    background: backgroundColor,
    text: textColor,
    subtitleText,
    accent: accentColor,
    cardSurface,
    success: successColor,
    border: borderColor,
  } = useTheme()

  const templates = useMemo(() => Object.values(exercises), [exercises])
  const sessionList = useMemo(() => Object.values(sessions), [sessions])
  const sessionForTemplate = useCallback(
    (templateId: string) =>
      sessionList.find(
        (session) =>
          session.templateId === templateId && session.status === 'in-progress',
      ) ??
      sessionList
        .filter((session) => session.templateId === templateId)
        .sort(
          (left, right) =>
            new Date(right.startedAt).getTime() -
            new Date(left.startedAt).getTime(),
        )[0],
    [sessionList],
  )

  const completedTemplateIds = useMemo(
    () =>
      new Set(
        templates
          .filter((template) => {
            const session = sessionForTemplate(template.id)
            return session?.status === 'complete'
          })
          .map((template) => template.id),
      ),
    [sessionForTemplate, templates],
  )
  const activeExercises = useMemo(
    () =>
      templates.filter((template) => !completedTemplateIds.has(template.id)),
    [completedTemplateIds, templates],
  )
  const completedExercises = useMemo(
    () => templates.filter((template) => completedTemplateIds.has(template.id)),
    [completedTemplateIds, templates],
  )

  const totalCount = templates.length
  const data = tab === 'active' ? activeExercises : completedExercises
  const completedCount = completedExercises.length
  const progress = totalCount > 0 ? completedCount / totalCount : 0
  const allDone = completedCount === totalCount && totalCount > 0
  const currentSessions = useMemo(
    () =>
      templates
        .map((template) => sessionForTemplate(template.id))
        .filter(Boolean),
    [sessionForTemplate, templates],
  )

  const totalSetsInfo = useMemo(
    () =>
      currentSessions.reduce(
        (counts, session) => ({
          completed: counts.completed + completedSetCount(session),
          total: counts.total + totalSetCount(session),
        }),
        { completed: 0, total: 0 },
      ),
    [currentSessions],
  )

  const renderItem = useCallback(
    ({ item, index }: { item: WorkoutTemplate; index: number }) => (
      <Workout
        item={item}
        session={sessionForTemplate(item.id)}
        index={index}
        isFirst={index === 0}
        isLast={index === data.length - 1}
      />
    ),
    [data.length, sessionForTemplate],
  )

  const keyExtractor = useCallback((item: WorkoutTemplate) => item.id, [])

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar />

      <FlatList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + 16 },
        ]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Large title */}
            <Animated.Text
              entering={FadeIn.duration(400)}
              style={[styles.largeTitle, { color: textColor }]}
            >
              Workouts
            </Animated.Text>

            {/* Progress hero card */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(400)}
              style={[styles.heroCard, { backgroundColor: cardSurface }]}
            >
              <View style={styles.heroLeft}>
                <CircularProgress
                  value={Math.round(progress * 100)}
                  radius={36}
                  duration={800}
                  activeStrokeWidth={6}
                  inActiveStrokeWidth={6}
                  maxValue={100}
                  activeStrokeColor={allDone ? successColor : accentColor}
                  inActiveStrokeColor={borderColor}
                >
                  <Text
                    style={[
                      styles.heroPercent,
                      { color: allDone ? successColor : textColor },
                    ]}
                  >
                    {Math.round(progress * 100)}%
                  </Text>
                </CircularProgress>
              </View>

              <View style={styles.heroRight}>
                <Text style={[styles.heroTitle, { color: textColor }]}>
                  {allDone
                    ? 'All Done!'
                    : `${totalCount - completedCount} workout${totalCount - completedCount !== 1 ? 's' : ''} left`}
                </Text>
                <View style={styles.heroStats}>
                  <View style={styles.heroStatItem}>
                    <Text style={[styles.heroStatValue, { color: textColor }]}>
                      {completedCount}/{totalCount}
                    </Text>
                    <Text
                      style={[styles.heroStatLabel, { color: subtitleText }]}
                    >
                      Workouts
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.heroStatDivider,
                      { backgroundColor: borderColor },
                    ]}
                  />
                  <View style={styles.heroStatItem}>
                    <Text style={[styles.heroStatValue, { color: textColor }]}>
                      {totalSetsInfo.completed}/{totalSetsInfo.total}
                    </Text>
                    <Text
                      style={[styles.heroStatLabel, { color: subtitleText }]}
                    >
                      Sets
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Segmented control */}
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <View style={styles.segmentedControl}>
                <SegmentedTabs
                  options={[
                    {
                      value: 'active',
                      label: `Active (${activeExercises.length})`,
                    },
                    {
                      value: 'completed',
                      label: `Done (${completedExercises.length})`,
                    },
                  ]}
                  value={tab}
                  onChange={setTab}
                  fullWidth
                />
              </View>
            </Animated.View>
          </>
        }
        ListEmptyComponent={
          <Animated.View
            entering={FadeIn.delay(300).duration(400)}
            style={styles.emptyContainer}
          >
            <Ionicons
              name={
                tab === 'active'
                  ? 'checkmark-done-circle-outline'
                  : 'barbell-outline'
              }
              size={48}
              color={subtitleText}
              style={styles.emptyIcon}
            />
            <Text style={[styles.emptyTitle, { color: textColor }]}>
              {tab === 'active' ? 'All workouts done!' : 'No completions yet'}
            </Text>
            <Text style={[styles.emptyText, { color: subtitleText }]}>
              {tab === 'active'
                ? 'Great job completing every workout.'
                : 'Start a workout and track your sets.'}
            </Text>
          </Animated.View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
  },
  /* ── Header ── */
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  /* ── Hero card ── */
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
  },
  heroLeft: {
    marginRight: 16,
  },
  heroPercent: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroRight: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroStatDivider: {
    width: 1,
    height: 20,
  },
  /* ── Segmented control ── */
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
  },
  /* ── Empty state ── */
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
})
