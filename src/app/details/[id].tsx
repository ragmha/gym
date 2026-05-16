import { CircularProgress } from '@/components/common/CircularProgress'
import { RestTimer } from '@/components/workout/RestTimer'
import VideoPlayer from '@/components/workout/VideoPlayer'
import { WorkoutCompleteModal } from '@/components/workout/WorkoutCompleteModal'
import WorkoutDetail from '@/components/workout/WorkoutDetail'
import { useTheme } from '@/hooks/useThemeColor'
import { useExerciseStore } from '@/stores/ExerciseStore'
import {
  cardioMinutes,
  completedSetCount,
  isComplete,
  totalSetCount,
  useWorkoutSessionStoreBase,
} from '@/stores/WorkoutSessionStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

/** Default rest time between sets in seconds (3 min) */
const REST_SECONDS = 180

function DetailsScreen() {
  const navigation = useNavigation()
  const { id: rawId, title: rawTitle } = useLocalSearchParams<{
    id: string
    title: string
  }>()
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const routeTitle = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle
  const { exercises } = useExerciseStore()
  const { session, updateCardio, toggleCardioDone, complete } =
    useWorkoutSessionStoreBase(
      useShallow((state) => ({
        session: id ? state.sessions[id] : undefined,
        updateCardio: state.updateCardio,
        toggleCardioDone: state.toggleCardioDone,
        complete: state.complete,
      })),
    )
  const template = session ? exercises[session.templateId] : undefined

  const {
    text: textColor,
    subtitleText,
    accent: accentColor,
    success: successColor,
    border: borderColor,
    cardSurface,
    background: backgroundColor,
  } = useTheme()

  const [showTimer, setShowTimer] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [hasShownComplete, setHasShownComplete] = useState(false)
  const [showCardioEditor, setShowCardioEditor] = useState(false)

  // Animated progress
  const progressWidth = useSharedValue(0)

  useEffect(() => {
    navigation.setOptions({ title: template?.title ?? routeTitle })
  }, [navigation, routeTitle, template?.title])

  const handleSetCompleted = () => {
    setShowTimer(true)
  }

  const handleSetUncompleted = () => {
    setShowTimer(false)
  }

  const completedSetsCount = session ? completedSetCount(session) : 0
  const totalSetsCount = session ? totalSetCount(session) : 0
  const progressFraction =
    totalSetsCount > 0 ? completedSetsCount / totalSetsCount : 0

  const completedExerciseCount = useMemo(() => {
    if (!session || !template) return 0
    return template.exercises.filter((detail) => {
      const progress = session.exerciseProgress[detail.id]
      return (
        progress?.selectedSets.length > 0 &&
        progress.selectedSets.every(Boolean)
      )
    }).length
  }, [session, template])

  const totalExerciseCount = template ? template.exercises.length : 0

  useEffect(() => {
    progressWidth.value = withTiming(progressFraction, { duration: 500 })
  }, [progressFraction, progressWidth])

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }))

  const allWorkoutsDone =
    Boolean(session && template && isComplete(session, template)) ||
    session?.status === 'complete'

  // Show congratulations modal once when all exercises become complete
  useEffect(() => {
    if (
      allWorkoutsDone &&
      !hasShownComplete &&
      session &&
      session.status !== 'complete'
    ) {
      setShowCompleteModal(true)
      setHasShownComplete(true)
      complete(session.id)
    }
  }, [allWorkoutsDone, complete, hasShownComplete, session])

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Fixed video */}
      <View style={styles.videoFixed}>
        {template && <VideoPlayer uri={template.videoURL ?? ''} />}
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {template && session && (
          <>
            {/* ── Summary card ── */}
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={[styles.summaryCard, { backgroundColor: cardSurface }]}
            >
              <View style={styles.summaryTop}>
                {/* Left side: progress ring */}
                <View style={styles.progressRingArea}>
                  <CircularProgress
                    value={Math.round(progressFraction * 100)}
                    radius={32}
                    duration={600}
                    activeStrokeWidth={5}
                    inActiveStrokeWidth={5}
                    maxValue={100}
                    activeStrokeColor={
                      allWorkoutsDone ? successColor : accentColor
                    }
                    inActiveStrokeColor={borderColor}
                  >
                    <Text
                      style={[
                        styles.ringPercent,
                        {
                          color: allWorkoutsDone ? successColor : textColor,
                        },
                      ]}
                    >
                      {Math.round(progressFraction * 100)}%
                    </Text>
                  </CircularProgress>
                </View>

                {/* Right side: stats */}
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text
                      style={[
                        styles.statValue,
                        {
                          color: allWorkoutsDone ? successColor : textColor,
                        },
                      ]}
                    >
                      {completedExerciseCount}/{totalExerciseCount}
                    </Text>
                    <Text style={[styles.statLabel, { color: subtitleText }]}>
                      Exercises
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: borderColor },
                    ]}
                  />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: textColor }]}>
                      {completedSetsCount}/{totalSetsCount}
                    </Text>
                    <Text style={[styles.statLabel, { color: subtitleText }]}>
                      Sets
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: borderColor },
                    ]}
                  />
                  <TouchableOpacity
                    style={styles.statItem}
                    onPress={() => setShowCardioEditor((v) => !v)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.statValue, { color: textColor }]}>
                      {cardioMinutes(session)}m
                    </Text>
                    <Text style={[styles.statLabel, { color: subtitleText }]}>
                      Cardio
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Animated progress bar */}
              <View
                style={[styles.progressTrack, { backgroundColor: borderColor }]}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: allWorkoutsDone
                        ? successColor
                        : accentColor,
                    },
                    animatedProgressStyle,
                  ]}
                />
              </View>

              {/* Completion banner */}
              {allWorkoutsDone && totalExerciseCount > 0 && (
                <Animated.View
                  entering={FadeIn.delay(300).duration(400)}
                  style={[
                    styles.completionBanner,
                    { backgroundColor: `${successColor}15` },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={successColor}
                  />
                  <Text
                    style={[styles.completionText, { color: successColor }]}
                  >
                    Workout Complete!
                  </Text>
                </Animated.View>
              )}
            </Animated.View>

            {/* ── Cardio editor ── */}
            {showCardioEditor && (
              <Animated.View
                entering={FadeInDown.duration(300)}
                style={[styles.cardioEditor, { backgroundColor: cardSurface }]}
              >
                <Text style={[styles.cardioEditorTitle, { color: textColor }]}>
                  Adjust Cardio
                </Text>

                {/* Morning */}
                <View style={styles.cardioRow}>
                  <Ionicons
                    name="sunny-outline"
                    size={16}
                    color={subtitleText}
                  />
                  <Text
                    style={[styles.cardioRowLabel, { color: subtitleText }]}
                  >
                    Morning
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleCardioDone(session.id, 'morning')}
                    activeOpacity={0.6}
                    accessibilityLabel={`Mark morning cardio ${session.cardioCompleted.morning ? 'incomplete' : 'complete'}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: session.cardioCompleted.morning,
                    }}
                    style={[
                      styles.cardioDoneBtn,
                      {
                        borderColor: session.cardioCompleted.morning
                          ? successColor
                          : borderColor,
                        backgroundColor: session.cardioCompleted.morning
                          ? `${successColor}20`
                          : 'transparent',
                      },
                    ]}
                  >
                    {session.cardioCompleted.morning ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={successColor}
                      />
                    ) : null}
                  </TouchableOpacity>
                  <View style={styles.cardioStepperRow}>
                    <TouchableOpacity
                      onPress={() =>
                        updateCardio(session.id, {
                          morning: session.cardio.morning - 5,
                          evening: session.cardio.evening,
                        })
                      }
                      style={[
                        styles.cardioStepperBtn,
                        { borderColor: borderColor },
                      ]}
                      activeOpacity={0.6}
                      disabled={session.cardio.morning <= 0}
                    >
                      <Text
                        style={[
                          styles.cardioStepperText,
                          {
                            color:
                              session.cardio.morning > 0
                                ? textColor
                                : subtitleText,
                          },
                        ]}
                      >
                        −
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={[styles.cardioStepperValue, { color: textColor }]}
                    >
                      {session.cardio.morning}m
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        updateCardio(session.id, {
                          morning: session.cardio.morning + 5,
                          evening: session.cardio.evening,
                        })
                      }
                      style={[
                        styles.cardioStepperBtn,
                        { borderColor: borderColor },
                      ]}
                      activeOpacity={0.6}
                    >
                      <Text
                        style={[styles.cardioStepperText, { color: textColor }]}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Evening */}
                <View style={styles.cardioRow}>
                  <Ionicons
                    name="moon-outline"
                    size={16}
                    color={subtitleText}
                  />
                  <Text
                    style={[styles.cardioRowLabel, { color: subtitleText }]}
                  >
                    Evening
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleCardioDone(session.id, 'evening')}
                    activeOpacity={0.6}
                    accessibilityLabel={`Mark evening cardio ${session.cardioCompleted.evening ? 'incomplete' : 'complete'}`}
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: session.cardioCompleted.evening,
                    }}
                    style={[
                      styles.cardioDoneBtn,
                      {
                        borderColor: session.cardioCompleted.evening
                          ? successColor
                          : borderColor,
                        backgroundColor: session.cardioCompleted.evening
                          ? `${successColor}20`
                          : 'transparent',
                      },
                    ]}
                  >
                    {session.cardioCompleted.evening ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={successColor}
                      />
                    ) : null}
                  </TouchableOpacity>
                  <View style={styles.cardioStepperRow}>
                    <TouchableOpacity
                      onPress={() =>
                        updateCardio(session.id, {
                          morning: session.cardio.morning,
                          evening: session.cardio.evening - 5,
                        })
                      }
                      style={[
                        styles.cardioStepperBtn,
                        { borderColor: borderColor },
                      ]}
                      activeOpacity={0.6}
                      disabled={session.cardio.evening <= 0}
                    >
                      <Text
                        style={[
                          styles.cardioStepperText,
                          {
                            color:
                              session.cardio.evening > 0
                                ? textColor
                                : subtitleText,
                          },
                        ]}
                      >
                        −
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={[styles.cardioStepperValue, { color: textColor }]}
                    >
                      {session.cardio.evening}m
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        updateCardio(session.id, {
                          morning: session.cardio.morning,
                          evening: session.cardio.evening + 5,
                        })
                      }
                      style={[
                        styles.cardioStepperBtn,
                        { borderColor: borderColor },
                      ]}
                      activeOpacity={0.6}
                    >
                      <Text
                        style={[styles.cardioStepperText, { color: textColor }]}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* ── Exercise list ── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: subtitleText }]}>
                EXERCISES
              </Text>
              <Text style={[styles.sectionCount, { color: subtitleText }]}>
                {completedExerciseCount} of {totalExerciseCount}
              </Text>
            </View>

            {template.exercises.map((detail, idx) => (
              <WorkoutDetail
                key={detail.id}
                item={detail}
                index={idx}
                sessionId={session.id}
                onSetCompleted={handleSetCompleted}
                onSetUncompleted={handleSetUncompleted}
              />
            ))}

            {/* Bottom spacer for rest timer */}
            <View style={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>

      {/* Rest timer snackbar */}
      {showTimer && (
        <RestTimer
          restSeconds={REST_SECONDS}
          onDismiss={() => setShowTimer(false)}
        />
      )}

      {/* Workout complete modal */}
      {template && session && (
        <WorkoutCompleteModal
          visible={showCompleteModal}
          onDismiss={() => setShowCompleteModal(false)}
          workoutTitle={template.title}
          exerciseCount={totalExerciseCount}
          setsCompleted={completedSetsCount}
          totalSets={totalSetsCount}
          cardioMinutes={cardioMinutes(session)}
        />
      )}
    </View>
  )
}

export default DetailsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  videoFixed: {
    overflow: 'hidden',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  /* ── Summary card ── */
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressRingArea: {
    marginRight: 16,
  },
  ringPercent: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statsGrid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  completionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  /* ── Section label ── */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  bottomSpacer: {
    height: 20,
  },
  /* ── Cardio editor ── */
  cardioEditor: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  cardioEditorTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardioRowLabel: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  cardioDoneBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardioStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardioStepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardioStepperText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 20,
  },
  cardioStepperValue: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'center',
  },
})
