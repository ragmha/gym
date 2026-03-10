import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CircularProgress } from '@/components/CircularProgress'
import { useHealthKit } from '@/hooks/useHealthKit'

// ── Constants ─────────────────────────────────────────────────────────

const DEFAULT_STEPS_GOAL = 10_000
const STORAGE_KEY = 'steps-goal'
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
type Period = 'Day' | 'Week' | 'Month'

// ── Helpers ─────────────────────────────────────────────────────────

function getDayOfWeekIndex(): number {
  const day = new Date().getDay() // 0=Sun
  return day === 0 ? 6 : day - 1 // Convert to Mon=0
}

function generateWeekData(todaySteps: number): number[] {
  // Generate plausible mock data for the week with today's actual steps
  const todayIdx = getDayOfWeekIndex()
  return DAYS_OF_WEEK.map((_, i) => {
    if (i === todayIdx) return todaySteps
    if (i > todayIdx) return 0 // Future days
    return Math.round(3000 + Math.random() * 12000) // Past days random
  })
}

// ── Component ───────────────────────────────────────────────────────

export default function StepsScreen() {
  const router = useRouter()
  const { steps, calories } = useHealthKit()
  const [period, setPeriod] = useState<Period>('Day')
  const [stepsGoal, setStepsGoal] = useState(DEFAULT_STEPS_GOAL)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalInput, setGoalInput] = useState('')

  // Load persisted goal
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val) {
        const parsed = parseInt(val, 10)
        if (!Number.isNaN(parsed) && parsed > 0) setStepsGoal(parsed)
      }
    })
  }, [])

  const saveGoal = useCallback(() => {
    const trimmed = goalInput.trim()
    if (!trimmed) {
      setShowGoalModal(false)
      return
    }
    const parsed = parseInt(trimmed, 10)
    if (Number.isNaN(parsed) || parsed <= 0 || parsed > 200_000) {
      if (Platform.OS === 'web') {
        alert('Enter a valid step goal (1 – 200,000).')
      } else {
        Alert.alert('Invalid goal', 'Enter a number between 1 and 200,000.')
      }
      return
    }
    setStepsGoal(parsed)
    AsyncStorage.setItem(STORAGE_KEY, String(parsed))
    setGoalInput('')
    setShowGoalModal(false)
    Keyboard.dismiss()
  }, [goalInput])

  const progress = Math.min(steps / stepsGoal, 1)
  const stepsRemaining = Math.max(0, stepsGoal - steps)
  const progressPercent = Math.round(progress * 100)

  // Estimate distance and active minutes from steps
  const distanceKm = (steps * 0.000762).toFixed(1) // ~0.762m per step
  const activeMinutes = Math.round(steps / 100) // ~100 steps/min

  const weekData = useMemo(() => generateWeekData(steps), [steps])
  const weekMax = Math.max(...weekData, 1)

  const todayIdx = getDayOfWeekIndex()

  const todayDate = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Steps</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => {
                setGoalInput(String(stepsGoal))
                setShowGoalModal(true)
              }}
              hitSlop={12}
            >
              <Ionicons name="settings-outline" size={22} color="#999" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Date */}
          <Text style={styles.dateText}>{todayDate}</Text>

          {/* Hero ring */}
          <View style={styles.ringContainer}>
            <CircularProgress
              value={steps}
              maxValue={stepsGoal}
              radius={100}
              activeStrokeWidth={14}
              inActiveStrokeWidth={14}
              activeStrokeColor="#6C63FF"
              inActiveStrokeColor="rgba(108,99,255,0.15)"
              duration={1200}
            >
              <View style={styles.ringCenter}>
                <Ionicons
                  name="footsteps"
                  size={24}
                  color="#6C63FF"
                  style={styles.ringIcon}
                />
                <Text style={styles.heroSteps}>
                  {steps > 0 ? steps.toLocaleString() : '0'}
                </Text>
                <Text style={styles.goalText}>
                  of {stepsGoal.toLocaleString()} steps
                </Text>
              </View>
            </CircularProgress>
          </View>

          {/* Sub-metrics row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Ionicons name="time-outline" size={20} color="#6C63FF" />
              <Text style={styles.metricValue}>{activeMinutes}</Text>
              <Text style={styles.metricLabel}>Min</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="navigate-outline" size={20} color="#6C63FF" />
              <Text style={styles.metricValue}>{distanceKm}</Text>
              <Text style={styles.metricLabel}>Km</Text>
            </View>
            <View style={styles.metricItem}>
              <Ionicons name="flash-outline" size={20} color="#6C63FF" />
              <Text style={styles.metricValue}>
                {calories > 0 ? calories : '0'}
              </Text>
              <Text style={styles.metricLabel}>Kcal</Text>
            </View>
          </View>

          {/* Remaining steps */}
          {stepsRemaining > 0 && (
            <View style={styles.remainingCard}>
              <Text style={styles.remainingText}>
                {stepsRemaining.toLocaleString()} steps to reach your goal
              </Text>
              <View style={styles.remainingBar}>
                <View
                  style={[
                    styles.remainingFill,
                    { width: `${progressPercent}%` },
                  ]}
                />
              </View>
              <Text style={styles.remainingPercent}>{progressPercent}%</Text>
            </View>
          )}

          {/* Period toggle */}
          <View style={styles.periodRow}>
            {(['Day', 'Week', 'Month'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.periodPill,
                  period === p && styles.periodPillActive,
                ]}
                onPress={() => setPeriod(p)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.periodText,
                    period === p && styles.periodTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Week analytics */}
          <Text style={styles.sectionTitle}>Week analytics</Text>
          <View style={styles.weekChart}>
            {weekData.map((val, i) => {
              const barHeight = weekMax > 0 ? (val / weekMax) * 120 : 0
              const isToday = i === todayIdx
              const isFuture = i > todayIdx

              return (
                <View key={i} style={styles.barCol}>
                  <View style={styles.barWrapper}>
                    {val > 0 && (
                      <Text style={styles.barLabel}>
                        {(val / 1000).toFixed(1)}k
                      </Text>
                    )}
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(barHeight, 4),
                          backgroundColor: isFuture
                            ? '#2A2A2A'
                            : isToday
                              ? '#6C63FF'
                              : 'rgba(108,99,255,0.4)',
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[styles.dayLabel, isToday && styles.dayLabelActive]}
                  >
                    {DAYS_OF_WEEK[i]}
                  </Text>
                </View>
              )
            })}

            {/* Goal line */}
            <View
              style={[
                styles.goalLine,
                { bottom: (stepsGoal / weekMax) * 120 + 20 },
              ]}
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Goal modal */}
      <Modal
        visible={showGoalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGoalModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowGoalModal(false)}
        >
          <Pressable style={styles.modalSheet} onPress={Keyboard.dismiss}>
            <Text style={styles.modalTitle}>Set Step Goal</Text>
            <Text style={styles.modalSubtitle}>
              Current goal: {stepsGoal.toLocaleString()} steps
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. 10000"
              placeholderTextColor="#666"
              keyboardType="number-pad"
              returnKeyType="done"
              value={goalInput}
              onChangeText={setGoalInput}
              onSubmitEditing={saveGoal}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={saveGoal}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0F1A',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  dateText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  // ── Ring ──────────────────────────────────────────────────────
  ringContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringIcon: {
    marginBottom: 4,
  },
  heroSteps: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 48,
  },
  goalText: {
    color: '#8B8FA3',
    fontSize: 13,
    marginTop: 2,
  },
  // ── Metrics row ───────────────────────────────────────────────
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#8B8FA3',
    fontSize: 12,
  },
  // ── Remaining card ────────────────────────────────────────────
  remainingCard: {
    backgroundColor: 'rgba(108,99,255,0.1)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  remainingText: {
    color: '#CCCCCC',
    fontSize: 13,
    marginBottom: 8,
  },
  remainingBar: {
    height: 6,
    backgroundColor: 'rgba(108,99,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  remainingFill: {
    height: '100%',
    backgroundColor: '#6C63FF',
    borderRadius: 3,
  },
  remainingPercent: {
    color: '#6C63FF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'right',
  },
  // ── Period toggle ─────────────────────────────────────────────
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  periodPill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#1A1D2E',
  },
  periodPillActive: {
    backgroundColor: '#6C63FF',
  },
  periodText: {
    color: '#8B8FA3',
    fontSize: 14,
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  // ── Week chart ────────────────────────────────────────────────
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  weekChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 170,
    paddingBottom: 24,
    position: 'relative',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  barLabel: {
    color: '#8B8FA3',
    fontSize: 9,
    marginBottom: 4,
  },
  bar: {
    width: 28,
    borderRadius: 6,
  },
  dayLabel: {
    color: '#8B8FA3',
    fontSize: 12,
    marginTop: 8,
  },
  dayLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(108,99,255,0.3)',
  },
  // ── Goal modal ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: '#1A1D2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: '#8B8FA3',
    fontSize: 14,
    marginBottom: 20,
  },
  modalInput: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalCancel: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalCancelText: {
    color: '#8B8FA3',
    fontSize: 15,
    fontWeight: '600',
  },
  modalSave: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
})
