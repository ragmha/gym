import { Ionicons } from '@expo/vector-icons'
import { requireNativeView, requireOptionalNativeModule } from 'expo'
import { useCameraPermissions } from 'expo-camera'
import { useKeepAwake } from 'expo-keep-awake'
import React, { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native'

import { DashboardText as Text } from '@/components/dashboard/DashboardText'
import { Layout, Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'
import {
  countRep,
  defaultJoint,
  emptyRepCount,
  type Joint,
  type RepCount,
} from '@/lib/repCount'

type AngleEvent = { nativeEvent: { joint: Joint; angle?: number } }
type ErrorEvent = { nativeEvent: { code: string } }

// RotationCoordinator needs iOS 17; older binaries and other platforms stay manual.
const RepCamera =
  Platform.OS === 'ios' &&
  Number.parseInt(String(Platform.Version), 10) >= 17 &&
  requireOptionalNativeModule('RepCamera')
    ? requireNativeView<
        ViewProps & {
          joint: Joint
          onAngle: (event: AngleEvent) => void
          onError: (event: ErrorEvent) => void
        }
      >('RepCamera')
    : null

export const repCameraAvailable = RepCamera !== null

const JOINTS: { joint: Joint; label: string }[] = [
  { joint: 'knee', label: 'Knees' },
  { joint: 'hip', label: 'Hips' },
  { joint: 'elbow', label: 'Elbows' },
]
const CAMERA_ERRORS: Record<string, string> = {
  unavailable:
    'No front camera is available on this device. Log reps manually.',
  permission:
    'Camera access is off. Enable it in Settings or log reps manually.',
  configuration:
    'The camera could not start. Close and try again, or log reps manually.',
  interrupted:
    'Camera counting was interrupted. Review the count or try again.',
  analysis: 'Body tracking stopped. Review the count or try again.',
}

/** Counts one set from the front camera. Frames stay on the device and are not saved. */
export function RepCameraCounter({
  title,
  onCount,
  onClose,
}: {
  title: string
  onCount: (reps: number) => void
  onClose: () => void
}) {
  useKeepAwake()
  const theme = useTheme()
  const [permission, requestPermission] = useCameraPermissions()
  const [joint, setJoint] = useState(() => defaultJoint(title))
  const jointRef = useRef(joint)
  const count = useRef<RepCount>(emptyRepCount)
  const [reps, setReps] = useState(0)
  const [inFrame, setInFrame] = useState(false)
  const [phase, setPhase] = useState<'setup' | 'counting' | 'review'>('setup')
  const counting = useRef(false)
  const submitted = useRef(false)
  const [bendAngle, setBendAngle] = useState(110)
  const [error, setError] = useState<string | null>(null)
  const [foreground, setForeground] = useState(
    AppState.currentState === 'active',
  )

  useEffect(() => {
    if (permission?.status === 'undetermined') {
      requestPermission().catch(() =>
        setError(
          'Camera permission could not be requested. Close and try again.',
        ),
      )
    }
  }, [permission?.status, requestPermission])

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      setForeground(state === 'active')
      if (state !== 'active') {
        setInFrame(false)
        if (counting.current) {
          counting.current = false
          setPhase('review')
          setError(
            'Counting paused when the app became inactive. Review the count.',
          )
        }
        count.current = { ...count.current, phase: 'ready' }
      }
    })
    return () => {
      counting.current = false
      listener.remove()
    }
  }, [])

  const chooseJoint = (next: Joint) => {
    count.current = emptyRepCount
    setReps(0)
    setInFrame(false)
    jointRef.current = next
    setJoint(next)
  }

  const onAngle = ({ nativeEvent }: AngleEvent) => {
    if (nativeEvent.joint !== jointRef.current) return
    const angle = nativeEvent.angle ?? null
    setInFrame(
      angle !== null && Number.isFinite(angle) && angle >= 0 && angle <= 180,
    )
    if (!counting.current) return
    const next = countRep(count.current, angle, bendAngle)
    if (next.reps !== count.current.reps) {
      setReps(next.reps)
      AccessibilityInfo.announceForAccessibility(String(next.reps))
    }
    count.current = next
  }

  const onError = ({ nativeEvent }: ErrorEvent) => {
    counting.current = false
    count.current = { ...count.current, phase: 'ready' }
    setInFrame(false)
    setPhase('review')
    setError(CAMERA_ERRORS[nativeEvent.code] ?? CAMERA_ERRORS.analysis)
  }

  const retry = () => {
    counting.current = false
    count.current = emptyRepCount
    setReps(0)
    setError(null)
    setInFrame(false)
    setPhase('setup')
  }

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <ScrollView
        testID="gym-rep-camera"
        style={{ backgroundColor: theme.homeBackground }}
        contentContainerStyle={styles.sheet}
      >
        <View style={styles.header}>
          <Text style={[styles.title, styles.flex, { color: theme.text }]}>
            Count {title}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={styles.close}
          >
            <Ionicons name="close" size={28} color={theme.text} />
          </Pressable>
        </View>

        <View style={[styles.camera, { backgroundColor: theme.goalTrack }]}>
          {RepCamera &&
          permission?.granted &&
          foreground &&
          phase !== 'review' &&
          !error ? (
            <RepCamera
              joint={joint}
              onAngle={onAngle}
              onError={onError}
              style={StyleSheet.absoluteFill}
            />
          ) : permission && !permission.granted && !permission.canAskAgain ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                Linking.openSettings().catch(() =>
                  setError(
                    'Settings could not be opened. Enable camera access in the Settings app.',
                  ),
                )
              }}
              style={styles.centered}
            >
              <Text style={[Typography.bodyMd, { color: theme.text }]}>
                Camera access is off. Turn it on in Settings to count reps.
              </Text>
            </Pressable>
          ) : permission && !permission.granted && permission.canAskAgain ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                requestPermission().catch(() =>
                  setError(
                    'Camera permission could not be requested. Close and try again.',
                  ),
                )
              }}
              style={styles.centered}
            >
              <Text style={[Typography.bodyMd, { color: theme.text }]}>
                Allow front camera
              </Text>
            </Pressable>
          ) : (
            <View style={styles.centered}>
              <Text style={[Typography.bodyMd, { color: theme.text }]}>
                {phase === 'review'
                  ? 'Camera stopped. Review your count.'
                  : 'Preparing the front camera…'}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[
            Typography.bodySm,
            { color: inFrame ? theme.subtitleText : theme.danger },
          ]}
        >
          {error ??
            (phase === 'review'
              ? 'Use the count, then correct the reps field before logging your set.'
              : inFrame
                ? phase === 'counting'
                  ? 'Counting. Start straight, bend, then straighten. Estimates only.'
                  : 'Body found. Choose a joint and start when ready.'
                : 'Keep just yourself in frame. Step back with your side visible; counting pauses if tracking is lost.')}
        </Text>

        {phase === 'setup' && (
          <View style={styles.row}>
            {JOINTS.map((option) => {
              const selected = option.joint === joint
              return (
                <Pressable
                  key={option.joint}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityHint="Choose the joint that bends most in this lift"
                  onPress={() => chooseJoint(option.joint)}
                  style={[
                    styles.chip,
                    {
                      borderColor: theme.goalComplete,
                      backgroundColor: selected
                        ? theme.goalComplete
                        : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.mono,
                      { color: selected ? theme.goalOnComplete : theme.text },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        )}

        {phase === 'setup' && (
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Require a deeper bend"
              disabled={bendAngle <= 60}
              onPress={() => setBendAngle((n) => n - 10)}
              style={styles.close}
            >
              <Text style={{ color: theme.text }}>−</Text>
            </Pressable>
            <Text style={[styles.mono, styles.flex, { color: theme.text }]}>
              Bend below {bendAngle}°
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Allow a shallower bend"
              disabled={bendAngle >= 130}
              onPress={() => setBendAngle((n) => n + 10)}
              style={styles.close}
            >
              <Text style={{ color: theme.text }}>+</Text>
            </Pressable>
          </View>
        )}

        {phase !== 'review' && (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled:
                phase === 'setup' && (!permission?.granted || !foreground),
            }}
            disabled={
              phase === 'setup' && (!permission?.granted || !foreground)
            }
            onPress={() => {
              if (counting.current) {
                counting.current = false
                setPhase('review')
              } else {
                count.current = emptyRepCount
                counting.current = true
                setPhase('counting')
              }
            }}
            style={[styles.use, { backgroundColor: theme.goalComplete }]}
          >
            <Text style={[styles.mono, { color: theme.goalOnComplete }]}>
              {phase === 'counting' ? 'Done counting' : 'Start counting'}
            </Text>
          </Pressable>
        )}

        <View style={styles.row}>
          <Text
            testID="gym-rep-camera-count"
            accessibilityLabel={`${reps} reps counted`}
            style={[styles.count, styles.flex, { color: theme.text }]}
          >
            {reps}
          </Text>
          <Pressable
            testID="gym-rep-camera-use"
            accessibilityRole="button"
            accessibilityState={{ disabled: reps === 0 || phase !== 'review' }}
            disabled={reps === 0 || phase !== 'review'}
            onPress={() => {
              if (submitted.current) return
              submitted.current = true
              onCount(reps)
            }}
            style={[
              styles.use,
              {
                backgroundColor: theme.goalComplete,
                opacity: reps === 0 || phase !== 'review' ? 0.4 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.mono,
                styles.bold,
                { color: theme.goalOnComplete },
              ]}
            >
              Use {reps} reps
            </Text>
          </Pressable>
        </View>
        {phase === 'review' && (
          <Pressable
            accessibilityRole="button"
            onPress={retry}
            style={styles.use}
          >
            <Text style={[styles.mono, { color: theme.text }]}>Try again</Text>
          </Pressable>
        )}
        <Text style={[styles.mono, { color: theme.subtitleText }]}>
          Video is analysed on this iPhone and never saved.
        </Text>
      </ScrollView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  sheet: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  title: { ...Typography.headingMd },
  flex: { flex: 1 },
  camera: { height: 260, borderRadius: Radii.lg, overflow: 'hidden' },
  close: {
    minWidth: Layout.controlSize,
    minHeight: Layout.controlSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  chip: {
    flex: 1,
    minHeight: Layout.controlSize,
    borderWidth: 2,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { ...Typography.numericLg, fontSize: 64, lineHeight: 72 },
  use: {
    minHeight: Layout.controlSize,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
    justifyContent: 'center',
  },
  mono: { ...Typography.labelMd },
  bold: { fontWeight: '700' },
})
