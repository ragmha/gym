import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { WeightBarChart } from '@/components/WeightBarChart'
import { WeightGoalSheet } from '@/components/WeightGoalSheet'
import { useWeightStore } from '@/stores/WeightStore'

const KG_TO_LBS = 2.20462

function formatWeight(kg: number, unit: 'kg' | 'lbs'): string {
  const val = unit === 'lbs' ? kg * KG_TO_LBS : kg
  return val.toFixed(1)
}

function formatLastTrackDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  if (dateStr === todayStr) return 'Today'

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === yesterday.toISOString().slice(0, 10)) {
    return `Yesterday, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export default function WeightScreen() {
  const router = useRouter()
  const { recentEntries, latestEntry, distanceToGoal, goalKg, unit, addEntry } =
    useWeightStore()

  const [showGoalSheet, setShowGoalSheet] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<TextInput>(null)

  const todayStr = useMemo(
    () =>
      new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    [],
  )

  const heroWeight = latestEntry
    ? formatWeight(latestEntry.weightKg, unit)
    : '--'
  const lastTrackText = latestEntry
    ? `Last track: ${formatLastTrackDate(latestEntry.date)}`
    : 'No entries yet'

  const goalDistanceText =
    distanceToGoal !== null
      ? `${Math.abs(unit === 'lbs' ? distanceToGoal * KG_TO_LBS : distanceToGoal).toFixed(1)} ${unit} TO GOAL`
      : null

  const handleAddEntry = useCallback(async () => {
    const trimmed = inputValue.trim()
    if (!trimmed) {
      setIsEditing(false)
      return
    }

    const parsed = parseFloat(trimmed)
    if (Number.isNaN(parsed) || parsed <= 0 || parsed > 500) {
      if (Platform.OS === 'web') {
        alert('Please enter a valid weight.')
      } else {
        Alert.alert('Invalid weight', 'Please enter a valid weight.')
      }
      return
    }

    const kg = unit === 'lbs' ? parsed / KG_TO_LBS : parsed
    await addEntry(kg)
    setInputValue('')
    setIsEditing(false)
    Keyboard.dismiss()
  }, [inputValue, unit, addEntry])

  const startEditing = useCallback(() => {
    setInputValue(heroWeight === '--' ? '' : heroWeight)
    setIsEditing(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [heroWeight])

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header row */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backButton}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowGoalSheet(true)}
            hitSlop={12}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={22} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Date */}
        <Text style={styles.dateText}>{todayStr.toUpperCase()}</Text>

        {/* Hero weight — tap to edit */}
        {isEditing ? (
          <TextInput
            ref={inputRef}
            style={styles.heroWeightInput}
            value={inputValue}
            onChangeText={setInputValue}
            onSubmitEditing={handleAddEntry}
            onBlur={handleAddEntry}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
            autoFocus
          />
        ) : (
          <Pressable onPress={startEditing}>
            <Text style={styles.heroWeight}>{heroWeight}</Text>
          </Pressable>
        )}

        {/* Goal distance OR set a goal */}
        {goalDistanceText ? (
          <Text style={styles.goalDistance}>{goalDistanceText}</Text>
        ) : (
          <Pressable onPress={() => setShowGoalSheet(true)}>
            <Text style={styles.setGoalText}>Set a goal</Text>
          </Pressable>
        )}

        {/* Last track info */}
        <Text style={styles.lastTrack}>{lastTrackText}</Text>

        {/* Bar chart */}
        <View style={styles.chartContainer}>
          <WeightBarChart
            entries={recentEntries}
            goalKg={goalKg}
            unit={unit}
            height={200}
          />
        </View>
      </SafeAreaView>

      {/* Goal sheet */}
      <WeightGoalSheet
        visible={showGoalSheet}
        onClose={() => setShowGoalSheet(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  backButton: {
    padding: 4,
  },
  settingsButton: {
    padding: 4,
  },
  dateText: {
    color: '#AAAAAA',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 16,
  },
  heroWeight: {
    color: '#FFFFFF',
    fontSize: 80,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 88,
  },
  heroWeightInput: {
    color: '#FFFFFF',
    fontSize: 80,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 88,
    borderBottomWidth: 2,
    borderBottomColor: '#FFB800',
    paddingBottom: 4,
  },
  goalDistance: {
    color: '#FFB800',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  setGoalText: {
    color: '#FFB800',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  lastTrack: {
    color: '#666666',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  chartContainer: {
    flex: 1,
    marginHorizontal: -8,
  },
})
