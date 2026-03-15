import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ActivityRings } from '@/components/ActivityRings'
import { useHealthKit } from '@/hooks/useHealthKit'

// ── Constants ─────────────────────────────────────────────────────────

const DEFAULT_STEPS_GOAL = 10_000
const STORAGE_KEY = 'steps-goal'

// Design palette (matches reference image)
const BG = '#111214'
const HEADER_BTN = '#2A2C31'
const ORANGE = '#E8873D'
const GRAY_RING = '#8E8E93'
const BLUE = '#2D7CF6'
const RING_BG = 'rgba(255,255,255,0.06)'
const TEXT_PRIMARY = '#FFFFFF'
const TEXT_SECONDARY = '#8A8E96'

const CALORIES_TARGET = 600 // kcal reference for ring
const DISTANCE_TARGET = 8 // km reference for ring
const MINUTES_TARGET = 60 // min reference for ring

// ── Component ───────────────────────────────────────────────────────

export default function StepsScreen() {
  const router = useRouter()
  const { steps, calories } = useHealthKit()
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

  // Derived metrics
  const distanceKm = parseFloat((steps * 0.000762).toFixed(1))
  const activeMinutes = Math.round(steps / 100)
  const caloriesVal = calories > 0 ? calories : Math.round(steps * 0.04)

  // Ring progress (0–1)
  const stepsProgress = Math.min(steps / stepsGoal, 1)
  const caloriesProgress = Math.min(caloriesVal / CALORIES_TARGET, 1)
  const distanceProgress = Math.min(distanceKm / DISTANCE_TARGET, 1)

  const rings = [
    { progress: stepsProgress, color: ORANGE, bgColor: RING_BG },
    { progress: distanceProgress, color: GRAY_RING, bgColor: RING_BG },
    { progress: caloriesProgress, color: BLUE, bgColor: RING_BG },
  ]

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.back()}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Steps Taken</Text>

          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              setGoalInput(String(stepsGoal))
              setShowGoalModal(true)
            }}
            hitSlop={12}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={TEXT_SECONDARY}
            />
          </TouchableOpacity>
        </View>

        {/* ── Content ────────────────────────────────────────── */}
        <View style={styles.content}>
          {/* Activity rings */}
          <View style={styles.ringsWrapper}>
            <ActivityRings
              rings={rings}
              size={280}
              strokeWidth={22}
              gap={4}
              duration={1400}
            >
              <View style={styles.centerIcon}>
                <Ionicons name="footsteps" size={30} color={TEXT_PRIMARY} />
              </View>
            </ActivityRings>
          </View>

          {/* Step count */}
          <Text style={styles.heroSteps}>
            {steps > 0 ? steps.toLocaleString() : '0'}
          </Text>
          <Text style={styles.heroLabel}>total steps</Text>

          {/* Bottom stat cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: ORANGE }]}>
                <Ionicons name="flame" size={22} color={TEXT_PRIMARY} />
              </View>
              <Text style={styles.statValue}>{caloriesVal}</Text>
              <Text style={styles.statLabel}>kcal</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#5A5C62' }]}>
                <Ionicons name="location" size={22} color={TEXT_PRIMARY} />
              </View>
              <Text style={styles.statValue}>{distanceKm}</Text>
              <Text style={styles.statLabel}>kilometer</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: BLUE }]}>
                <Ionicons name="time" size={22} color={TEXT_PRIMARY} />
              </View>
              <Text style={styles.statValue}>{activeMinutes}</Text>
              <Text style={styles.statLabel}>minute</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Goal modal ───────────────────────────────────────── */}
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
    backgroundColor: BG,
  },
  safeArea: {
    flex: 1,
  },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: HEADER_BTN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Content ───────────────────────────────────────────────────
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // ── Rings ─────────────────────────────────────────────────────
  ringsWrapper: {
    marginBottom: 28,
  },
  centerIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#0A0B0D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Hero text ─────────────────────────────────────────────────
  heroSteps: {
    color: TEXT_PRIMARY,
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  heroLabel: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 44,
  },

  // ── Bottom stat cards ─────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Goal modal ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: '#1C1E24',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    marginBottom: 20,
  },
  modalInput: {
    color: TEXT_PRIMARY,
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
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '600',
  },
  modalSave: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: ORANGE,
  },
  modalSaveText: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
})
