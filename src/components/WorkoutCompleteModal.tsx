import { useTheme } from '@/hooks/useThemeColor'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useCallback } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated'

interface WorkoutCompleteModalProps {
  visible: boolean
  onDismiss: () => void
  workoutTitle: string
  exerciseCount: number
  setsCompleted: number
  totalSets: number
  cardioMinutes?: number
}

export function WorkoutCompleteModal({
  visible,
  onDismiss,
  workoutTitle,
  exerciseCount,
  setsCompleted,
  totalSets,
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
  } = useTheme()

  const handleDismiss = useCallback(() => {
    onDismiss()
  }, [onDismiss])

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
              You crushed {workoutTitle}.{'\n'}Keep pushing forward!
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
                  {exerciseCount}
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
                  {setsCompleted}
                  <Text style={[styles.statSuffix, { color: subtitleText }]}>
                    /{totalSets}
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
