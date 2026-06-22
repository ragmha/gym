import { activeCoachEngine, buildWorkoutContext } from '@/lib/coach'
import {
  computeWorkoutEfficiency,
  fetchPriorAggregates,
  type WorkoutEfficiency,
} from '@/lib/workoutEfficiency'
import type { WorkoutSession, WorkoutTemplate } from '@/types/models'
import type { WorkoutNarration } from '@/lib/validators'
import { useTheme } from '@/hooks/useThemeColor'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated'

interface WorkoutCompleteModalProps {
  visible: boolean
  onDismiss: () => void
  session: WorkoutSession
  template: WorkoutTemplate
  cardioMinutes?: number
}

export function WorkoutCompleteModal({
  visible,
  onDismiss,
  session,
  template,
  cardioMinutes,
}: WorkoutCompleteModalProps) {
  const {
    text: textColor,
    success: successColor,
    accent: accentColor,
    cardSurface,
    subtitleText,
    border: borderColor,
    background: backgroundColor,
    warning: warningColor,
  } = useTheme()
  const processedSessionIds = useRef(new Set<string>())
  const [efficiency, setEfficiency] = useState<WorkoutEfficiency>(() =>
    computeWorkoutEfficiency(session, template),
  )
  const [narration, setNarration] = useState<WorkoutNarration | null>(null)
  const [isNarrationLoading, setIsNarrationLoading] = useState(false)

  const handleDismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

  useEffect(() => {
    if (!visible) {
      return
    }

    setEfficiency(computeWorkoutEfficiency(session, template))

    if (!session.completedAt) {
      setNarration(null)
      setIsNarrationLoading(false)
      return
    }

    if (processedSessionIds.current.has(session.id)) {
      return
    }

    processedSessionIds.current.add(session.id)

    let isCancelled = false
    setNarration(null)
    setIsNarrationLoading(true)
    async function buildSummary() {
      const priorAggregates = await fetchPriorAggregates(
        template.title,
        5,
        session.completedAt ?? undefined,
      )

      if (isCancelled) {
        return
      }

      const nextEfficiency = computeWorkoutEfficiency(
        session,
        template,
        priorAggregates,
      )
      setEfficiency(nextEfficiency)

      try {
        const nextNarration = await activeCoachEngine.narrateWorkout(
          buildWorkoutContext({
            session,
            template,
            recovery: null,
            history: priorAggregates,
          }),
        )

        if (!isCancelled) {
          setNarration(nextNarration)
        }
      } catch (error) {
        console.warn('Failed to narrate workout summary', error)
      } finally {
        if (!isCancelled) {
          setIsNarrationLoading(false)
        }
      }
    }

    void buildSummary()

    return () => {
      isCancelled = true
    }
  }, [session, template, visible])

  const toneColor = getToneColor(
    narration?.tone ?? 'steady',
    successColor,
    accentColor,
    warningColor,
  )

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={[styles.fullScreen, { backgroundColor }]}>
        {/* Centered content */}
        <View style={styles.centeredContent}>
          {/* Trophy / medal area */}
          <Animated.View
            entering={FadeIn.delay(200).duration(600)}
            style={styles.iconArea}
          >
            <View
              style={[
                styles.iconCircleOuter,
                { borderColor: `${successColor}30` },
              ]}
            >
              <View
                style={[
                  styles.iconCircleInner,
                  { backgroundColor: `${successColor}18` },
                ]}
              >
                <Ionicons name="trophy" size={72} color={successColor} />
              </View>
            </View>
          </Animated.View>

          {/* Congratulations text */}
          <Animated.View entering={FadeInUp.delay(300).duration(400)}>
            <Text style={[styles.title, { color: successColor }]}>
              Congratulations!
            </Text>
            <Text style={[styles.subtitle, { color: subtitleText }]}>
              You crushed {template.title}.{'\n'}Keep pushing forward!
            </Text>
          </Animated.View>

          {/* Workout Details card */}
          <Animated.View
            entering={FadeInUp.delay(450).duration(400)}
            style={[styles.detailsCard, { backgroundColor: cardSurface }]}
          >
            <View style={styles.detailsHeader}>
              <Ionicons name="barbell-outline" size={18} color={accentColor} />
              <Text style={[styles.detailsTitle, { color: textColor }]}>
                Workout Details
              </Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text style={[styles.statNumber, { color: textColor }]}>
                  {template.exercises.length}
                </Text>
                <Text style={[styles.statUnit, { color: subtitleText }]}>
                  EXERCISES
                </Text>
              </View>

              <View
                style={[styles.statDivider, { backgroundColor: borderColor }]}
              />

              <View style={styles.statBlock}>
                <Text style={[styles.statNumber, { color: textColor }]}>
                  {efficiency.completedSets}
                  <Text style={[styles.statSuffix, { color: subtitleText }]}>
                    /{efficiency.totalSets}
                  </Text>
                </Text>
                <Text style={[styles.statUnit, { color: subtitleText }]}>
                  SETS
                </Text>
              </View>

              {cardioMinutes != null && cardioMinutes > 0 && (
                <>
                  <View
                    style={[
                      styles.statDivider,
                      { backgroundColor: borderColor },
                    ]}
                  />
                  <View style={styles.statBlock}>
                    <Text style={[styles.statNumber, { color: textColor }]}>
                      {cardioMinutes}
                      <Text
                        style={[styles.statSuffix, { color: subtitleText }]}
                      >
                        min
                      </Text>
                    </Text>
                    <Text style={[styles.statUnit, { color: subtitleText }]}>
                      CARDIO
                    </Text>
                  </View>
                </>
              )}
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(525).duration(400)}
            style={[styles.efficiencyCard, { backgroundColor: cardSurface }]}
          >
            <View style={styles.detailsHeader}>
              <Ionicons
                name="speedometer-outline"
                size={18}
                color={accentColor}
              />
              <Text style={[styles.detailsTitle, { color: textColor }]}>
                Workout efficiency
              </Text>
            </View>

            <View style={styles.efficiencyGrid}>
              <EfficiencyMetric
                label="Volume"
                value={`${formatNumber(efficiency.totalVolumeKg)}kg`}
                color={textColor}
                labelColor={subtitleText}
              />
              <EfficiencyMetric
                label="Sets"
                value={`${efficiency.completedSets}/${efficiency.totalSets}`}
                color={textColor}
                labelColor={subtitleText}
              />
              <EfficiencyMetric
                label="Duration"
                value={formatDuration(efficiency.durationMinutes)}
                color={textColor}
                labelColor={subtitleText}
              />
              <EfficiencyMetric
                label="Density"
                value={formatDensity(efficiency.sessionDensityKgPerMin)}
                color={textColor}
                labelColor={subtitleText}
              />
              {efficiency.volumeVsPriorSessionPct !== null && (
                <EfficiencyMetric
                  label="vs last session"
                  value={formatVolumeVsPriorSession(
                    efficiency.volumeVsPriorSessionPct,
                  )}
                  color={
                    efficiency.volumeVsPriorSessionPct >= 0
                      ? successColor
                      : warningColor
                  }
                  labelColor={subtitleText}
                />
              )}
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.delay(600).duration(400)}
            style={[styles.coachCard, { backgroundColor: cardSurface }]}
          >
            <View style={styles.coachLabelRow}>
              <View style={[styles.toneDot, { backgroundColor: toneColor }]} />
              <Text style={[styles.coachLabel, { color: subtitleText }]}>
                AI Coach · On-device
              </Text>
            </View>

            {narration ? (
              <>
                <Text style={[styles.coachHeadline, { color: toneColor }]}>
                  {narration.headline}
                </Text>
                <Text style={[styles.coachSummary, { color: textColor }]}>
                  {narration.summary}
                </Text>
                <Text style={[styles.coachTip, { color: subtitleText }]}>
                  Next: {narration.nextSessionTip}
                </Text>
              </>
            ) : isNarrationLoading ? (
              <Text style={[styles.coachSummary, { color: subtitleText }]}>
                AI coach is reviewing your session…
              </Text>
            ) : null}
          </Animated.View>
        </View>

        {/* Dismiss button pinned to bottom */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(400)}
          style={styles.buttonArea}
        >
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: pressed ? `${successColor}dd` : successColor,
              },
            ]}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* ── Icon ── */
  iconArea: {
    marginBottom: 24,
  },
  iconCircleOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleInner: {
    width: 116,
    height: 116,
    borderRadius: 58,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* ── Text ── */
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  /* ── Details card ── */
  detailsCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  detailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  detailsTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBlock: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statSuffix: {
    fontSize: 16,
    fontWeight: '500',
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  efficiencyCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  efficiencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
  },
  efficiencyMetric: {
    width: '50%',
  },
  efficiencyValue: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  efficiencyLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginTop: 3,
    textTransform: 'uppercase',
  },
  coachCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  coachLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  toneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  coachLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  coachHeadline: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  coachSummary: {
    fontSize: 14,
    lineHeight: 20,
  },
  coachTip: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  /* ── Button ── */
  buttonArea: {
    width: '100%',
    paddingTop: 16,
  },
  button: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
})

interface EfficiencyMetricProps {
  label: string
  value: string
  color: string
  labelColor: string
}

function EfficiencyMetric({
  label,
  value,
  color,
  labelColor,
}: EfficiencyMetricProps) {
  return (
    <View style={styles.efficiencyMetric}>
      <Text style={[styles.efficiencyValue, { color }]}>{value}</Text>
      <Text style={[styles.efficiencyLabel, { color: labelColor }]}>
        {label}
      </Text>
    </View>
  )
}

function getToneColor(
  tone: WorkoutNarration['tone'],
  successColor: string,
  accentColor: string,
  warningColor: string,
): string {
  if (tone === 'celebrate') {
    return successColor
  }

  if (tone === 'caution') {
    return warningColor
  }

  return accentColor
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString()
}

function formatDuration(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}m`
}

function formatDensity(value: number | null): string {
  return value === null ? '—' : `${Math.round(value)}kg/min`
}

function formatVolumeVsPriorSession(value: number): string {
  const arrow = value >= 0 ? '↑' : '↓'
  return `${arrow} ${Math.abs(value).toFixed(1)}%`
}
