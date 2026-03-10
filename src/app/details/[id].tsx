import { CircularProgress } from '@/components/CircularProgress'
import { RestTimer } from '@/components/RestTimer'
import VideoPlayer from '@/components/VideoPlayer'
import WorkoutDetail from '@/components/WorkoutDetail'
import { useThemeColor } from '@/hooks/useThemeColor'
import { useExerciseStore } from '@/stores/ExerciseStore'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useLocalSearchParams, useNavigation } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

/** Default rest time between sets in seconds (3 min) */
const REST_SECONDS = 180

function DetailsScreen() {
  const navigation = useNavigation()
  const { id: rawId, title: rawTitle } = useLocalSearchParams<{
    id: string
    title: string
  }>()
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const title = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle
  const { exercises, completeExerciseDetail, completeExercise } =
    useExerciseStore()
  const exercise = id ? exercises[id] : undefined

  const textColor = useThemeColor({}, 'text')
  const subtitleText = useThemeColor({}, 'subtitleText')
  const accentColor = useThemeColor({}, 'accent')
  const successColor = useThemeColor({}, 'success')
  const borderColor = useThemeColor({}, 'border')
  const cardSurface = useThemeColor({}, 'cardSurface')
  const backgroundColor = useThemeColor({}, 'background')

  const [showTimer, setShowTimer] = useState(false)

  // Animated progress
  const progressWidth = useSharedValue(0)

  useEffect(() => {
    navigation.setOptions({ title })
  }, [navigation, title])

  const handleExerciseComplete = useCallback(
    (detailId: string, isComplete: boolean, selectedSets: boolean[]) => {
      if (!exercise) return
      completeExerciseDetail(
        exercise.localId,
        detailId,
        isComplete,
        selectedSets,
      )

      const allCompleted = exercise.exercises.every((e) =>
        e.id === detailId ? isComplete : e.completed,
      )

      if (allCompleted !== exercise.completed) {
        completeExercise(exercise.localId)
      }
    },
    [exercise, completeExerciseDetail, completeExercise],
  )

  const handleSetCompleted = useCallback(() => {
    setShowTimer(true)
  }, [])

  const completedExerciseCount = exercise
    ? exercise.exercises.filter((e) => e.completed).length
    : 0
  const totalExerciseCount = exercise ? exercise.exercises.length : 0
  const progressFraction =
    totalExerciseCount > 0 ? completedExerciseCount / totalExerciseCount : 0

  // Compute total sets across all exercises
  const { completedSetsCount, totalSetsCount } = useMemo(() => {
    if (!exercise) return { completedSetsCount: 0, totalSetsCount: 0 }
    let completed = 0
    let total = 0
    for (const ex of exercise.exercises) {
      const sets = ex.selectedSets ?? []
      total += sets.length
      completed += sets.filter(Boolean).length
    }
    return { completedSetsCount: completed, totalSetsCount: total }
  }, [exercise])

  useEffect(() => {
    progressWidth.value = withTiming(progressFraction, { duration: 500 })
  }, [progressFraction, progressWidth])

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%`,
  }))

  const allWorkoutsDone = completedExerciseCount === totalExerciseCount

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {/* Fixed video */}
      <View style={styles.videoFixed}>
        {exercise && <VideoPlayer uri={exercise.videoURL} />}
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {exercise && (
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
                  {exercise.cardio && (
                    <>
                      <View
                        style={[
                          styles.statDivider,
                          { backgroundColor: borderColor },
                        ]}
                      />
                      <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: textColor }]}>
                          {exercise.cardio.morning + exercise.cardio.evening}m
                        </Text>
                        <Text
                          style={[styles.statLabel, { color: subtitleText }]}
                        >
                          Cardio
                        </Text>
                      </View>
                    </>
                  )}
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

            {/* ── Exercise list ── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: subtitleText }]}>
                EXERCISES
              </Text>
              <Text style={[styles.sectionCount, { color: subtitleText }]}>
                {completedExerciseCount} of {totalExerciseCount}
              </Text>
            </View>

            {exercise.exercises.map((detail, idx) => (
              <WorkoutDetail
                key={detail.id}
                item={detail}
                index={idx}
                exerciseId={exercise.localId}
                onComplete={(isComplete, selectedSets) =>
                  handleExerciseComplete(detail.id, isComplete, selectedSets)
                }
                onSetCompleted={handleSetCompleted}
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
})
