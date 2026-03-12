import { useTheme } from '@/hooks/useThemeColor'
import { useExerciseStore } from '@/stores/ExerciseStore'
import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

type ExerciseDetailItem = {
  id: string
  title: string
  sets: number | 'To Failure'
  reps: number
  variation: string | null
}

type WorkoutDetailProps = {
  item: ExerciseDetailItem
  exerciseId: string
  index: number
  onComplete?: (isComplete: boolean, selectedSets: boolean[]) => void
  onSetCompleted?: () => void
  onSetUncompleted?: () => void
}

export default function WorkoutDetail({
  item,
  exerciseId,
  index,
  onComplete,
  onSetCompleted,
  onSetUncompleted,
}: WorkoutDetailProps) {
  const defaultSets =
    typeof item.sets === 'string' || isNaN(item.sets) ? 1 : item.sets
  const { getSelectedSets } = useExerciseStore()
  const initialSelectedCircles = getSelectedSets(exerciseId, item.id)

  const [selectedCircles, setSelectedCircles] = useState<boolean[]>(
    initialSelectedCircles.length > 0
      ? initialSelectedCircles
      : Array.from({ length: defaultSets }, () => false),
  )

  const completedCount = selectedCircles.filter(Boolean).length
  const scale = useSharedValue(1)
  const progressAnim = useSharedValue(
    defaultSets > 0 ? completedCount / defaultSets : 0,
  )

  const toggleCircle = (idx: number) => {
    const next = [...selectedCircles]
    const wasCompleted = next[idx]
    next[idx] = !next[idx]
    setSelectedCircles(next)

    const newCompletedCount = next.filter(Boolean).length
    progressAnim.value = withTiming(
      defaultSets > 0 ? newCompletedCount / defaultSets : 0,
      { duration: 300 },
    )

    // Micro-bounce feedback
    scale.value = withSpring(0.95, { damping: 15 }, () => {
      scale.value = withSpring(1)
    })

    const allCompleted = next.every(Boolean)
    onComplete?.(allCompleted, next)

    if (!wasCompleted && !allCompleted) {
      onSetCompleted?.()
    } else if (wasCompleted) {
      onSetUncompleted?.()
    }
  }

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }))

  const {
    text: textColor,
    subtitleText,
    cardSurface,
    success: successColor,
    successInactive,
    border: borderColor,
    accent: accentColor,
  } = useTheme()

  const allDone = selectedCircles.every(Boolean)
  const hasStarted = completedCount > 0

  return (
    <Animated.View
      entering={FadeIn.delay(index * 60).duration(300)}
      style={[styles.card, { backgroundColor: cardSurface }]}
    >
      {/* Row 1: Index badge + Title + Completion fraction */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.indexBadge,
            {
              backgroundColor: allDone
                ? successColor
                : hasStarted
                  ? accentColor
                  : borderColor,
            },
          ]}
        >
          {allDone ? (
            <Text style={[styles.indexText, { color: '#fff' }]}>✓</Text>
          ) : (
            <Text
              style={[
                styles.indexText,
                { color: hasStarted ? '#fff' : subtitleText },
              ]}
            >
              {index + 1}
            </Text>
          )}
        </View>
        <View style={styles.titleBlock}>
          <Text
            style={[
              styles.title,
              { color: allDone ? subtitleText : textColor },
              allDone && styles.titleDone,
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <View style={styles.detailRow}>
            {item.variation ? (
              <Text style={[styles.variation, { color: subtitleText }]}>
                {item.variation}
              </Text>
            ) : null}
            <Text style={[styles.repsInfo, { color: subtitleText }]}>
              {defaultSets} × {item.reps} reps
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.fraction,
            {
              color: allDone
                ? successColor
                : hasStarted
                  ? accentColor
                  : subtitleText,
            },
          ]}
        >
          {completedCount}/{defaultSets}
        </Text>
      </View>

      {/* Row 2: Set pills */}
      <Animated.View style={[styles.pillRow, bounceStyle]}>
        {Array.from({ length: defaultSets }).map((_, i) => {
          const done = selectedCircles[i]
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.6}
              onPress={() => toggleCircle(i)}
              style={[
                styles.pill,
                {
                  backgroundColor: done ? successInactive : 'transparent',
                  borderColor: done ? successColor : borderColor,
                },
              ]}
            >
              {done ? (
                <Text style={[styles.pillCheck, { color: successColor }]}>
                  ✓
                </Text>
              ) : (
                <View style={styles.pillContent}>
                  <Text style={[styles.pillLabel, { color: subtitleText }]}>
                    S{i + 1}
                  </Text>
                  <Text style={[styles.pillText, { color: textColor }]}>
                    {item.reps}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </Animated.View>

      {/* Mini progress bar */}
      {hasStarted && (
        <View style={[styles.progressTrack, { backgroundColor: borderColor }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: allDone ? successColor : accentColor,
              },
              animatedProgressStyle,
            ]}
          />
        </View>
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  /* Row 1 */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  indexText: {
    fontSize: 13,
    fontWeight: '700',
  },
  titleBlock: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  titleDone: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  variation: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  repsInfo: {
    fontSize: 12,
    fontWeight: '400',
  },
  fraction: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  /* Row 2 */
  pillRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    height: 44,
    minWidth: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  pillContent: {
    alignItems: 'center',
  },
  pillLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  pillCheck: {
    fontSize: 18,
    fontWeight: '700',
  },
  /* Progress */
  progressTrack: {
    height: 2,
    borderRadius: 1,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
})
