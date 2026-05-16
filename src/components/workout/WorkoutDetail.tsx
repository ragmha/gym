import { useTheme } from '@/hooks/useThemeColor'
import { useWorkoutSessionStoreBase } from '@/stores/WorkoutSessionStore'
import type { ExerciseDetailTemplate } from '@/types/models'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { useShallow } from 'zustand/react/shallow'

type WorkoutDetailProps = {
  item: ExerciseDetailTemplate
  sessionId: string
  index: number
  onComplete?: (isComplete: boolean, selectedSets: boolean[]) => void
  onSetCompleted?: () => void
  onSetUncompleted?: () => void
}

export default function WorkoutDetail({
  item,
  sessionId,
  index,
  onComplete,
  onSetCompleted,
  onSetUncompleted,
}: WorkoutDetailProps) {
  const router = useRouter()
  const { progress, toggleSet, setWeightForSet } = useWorkoutSessionStoreBase(
    useShallow((state) => ({
      progress: state.sessions[sessionId]?.exerciseProgress[item.id],
      toggleSet: state.toggleSet,
      setWeightForSet: state.setWeightForSet,
    })),
  )

  const defaultSets = progress?.setsOverride ?? item.sets
  const effectiveReps = progress?.repsOverride ?? item.reps
  const effectiveVariation =
    progress?.variationOverride !== undefined
      ? progress.variationOverride
      : item.variation
  const selectedCircles =
    progress?.selectedSets ?? Array.from({ length: defaultSets }, () => false)
  const weights =
    progress?.weightPerSet ?? Array.from({ length: defaultSets }, () => 0)
  const completedCount = selectedCircles.filter(Boolean).length
  // Top-line weight summary: the most-recently entered (highest-index)
  // non-zero kg value, falling back to the first set's weight.
  const summaryWeight = (() => {
    for (let i = weights.length - 1; i >= 0; i--) {
      const w = weights[i] ?? 0
      if (w > 0) return w
    }
    return 0
  })()
  const scale = useSharedValue(1)
  const progressAnim = useSharedValue(
    defaultSets > 0 ? completedCount / defaultSets : 0,
  )

  useEffect(() => {
    progressAnim.value = withTiming(
      defaultSets > 0 ? completedCount / defaultSets : 0,
      { duration: 300 },
    )
  }, [completedCount, defaultSets, progressAnim])

  const handleWeightInput = useCallback(
    (setIdx: number, text: string) => {
      const parsed = parseFloat(text)
      setWeightForSet(
        sessionId,
        item.id,
        setIdx,
        Number.isNaN(parsed) ? 0 : Math.max(0, parsed),
      )
    },
    [item.id, sessionId, setWeightForSet],
  )

  const toggleCircle = (idx: number) => {
    const next = [...selectedCircles]
    const wasCompleted = next[idx]
    next[idx] = !next[idx]
    toggleSet(sessionId, item.id, idx)

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
        <TouchableOpacity
          style={styles.titleBlock}
          onPress={() =>
            router.push({
              pathname: '/exercise-edit',
              params: { sessionId, detailId: item.id },
            })
          }
          activeOpacity={0.6}
        >
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
            {effectiveVariation ? (
              <Text style={[styles.variation, { color: subtitleText }]}>
                {effectiveVariation}
              </Text>
            ) : null}
            <Text style={[styles.repsInfo, { color: subtitleText }]}>
              {defaultSets} × {effectiveReps} reps
            </Text>
            {summaryWeight > 0 && (
              <Text style={[styles.repsInfo, { color: subtitleText }]}>
                · up to {summaryWeight} kg
              </Text>
            )}
          </View>
        </TouchableOpacity>
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

      {/* Per-set columns: kg input on top, tappable pill below */}
      <Animated.View style={[styles.columnRow, bounceStyle]}>
        {Array.from({ length: defaultSets }).map((_, i) => {
          const done = selectedCircles[i]
          const kg = weights[i] ?? 0
          return (
            <View key={i} style={styles.setColumn}>
              <View
                style={[
                  styles.kgWrap,
                  {
                    borderColor: done ? successColor : borderColor,
                    backgroundColor: done ? `${successColor}10` : 'transparent',
                  },
                ]}
              >
                <TextInput
                  style={[styles.kgInput, { color: textColor }]}
                  value={kg > 0 ? String(kg) : ''}
                  placeholder="0"
                  placeholderTextColor={subtitleText}
                  keyboardType="numeric"
                  onChangeText={(t) => handleWeightInput(i, t)}
                  selectTextOnFocus
                  accessibilityLabel={`Weight for set ${i + 1}`}
                />
                <Text style={[styles.kgUnit, { color: subtitleText }]}>kg</Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => toggleCircle(i)}
                accessibilityLabel={`Set ${i + 1}, ${done ? 'completed' : 'incomplete'}`}
                accessibilityRole="button"
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
                      {effectiveReps}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
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
  /* Per-set column row */
  columnRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  setColumn: {
    alignItems: 'center',
    gap: 6,
  },
  kgWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 2,
    minWidth: 56,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  kgInput: {
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    minWidth: 24,
    padding: 0,
  },
  kgUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
  pill: {
    height: 44,
    minWidth: 56,
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
