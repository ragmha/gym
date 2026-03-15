import { useTheme } from '@/hooks/useThemeColor'
import { useExerciseStore } from '@/stores/ExerciseStore'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const WEIGHT_STEP = 2.5

export default function ExerciseEditScreen() {
  const router = useRouter()
  const { exerciseLocalId, detailId } = useLocalSearchParams<{
    exerciseLocalId: string
    detailId: string
  }>()

  const { exercises, updateExerciseDetail } = useExerciseStore()
  const exercise = exerciseLocalId ? exercises[exerciseLocalId] : undefined
  const detail = exercise?.exercises.find((d) => d.id === detailId)

  const {
    text: textColor,
    subtitleText,
    accent: accentColor,
    background: backgroundColor,
    cardBackground,
    border: borderColor,
  } = useTheme()

  const [sets, setSets] = useState(detail?.sets ?? 3)
  const [reps, setReps] = useState(detail?.reps ?? 10)
  const [weight, setWeight] = useState(detail?.weightPerSet[0] ?? 0)
  const [variation, setVariation] = useState(detail?.variation ?? '')

  const handleSave = useCallback(() => {
    if (!exerciseLocalId || !detailId) return
    updateExerciseDetail(exerciseLocalId, detailId, {
      sets,
      reps,
      defaultWeight: weight,
      variation: variation.trim() || null,
    })
    router.back()
  }, [
    exerciseLocalId,
    detailId,
    sets,
    reps,
    weight,
    variation,
    updateExerciseDetail,
    router,
  ])

  if (!detail || !exercise) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <Text style={[styles.errorText, { color: textColor }]}>
          Exercise not found
        </Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: textColor }]}
          numberOfLines={1}
        >
          {detail.title}
        </Text>
        <TouchableOpacity onPress={handleSave} hitSlop={12}>
          <Text style={[styles.saveText, { color: accentColor }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Sets */}
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <Text style={[styles.label, { color: subtitleText }]}>Sets</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              onPress={() => setSets((s) => Math.max(1, s - 1))}
              style={[styles.stepperBtn, { borderColor }]}
              activeOpacity={0.6}
            >
              <Text style={[styles.stepperBtnText, { color: textColor }]}>
                −
              </Text>
            </TouchableOpacity>
            <Text style={[styles.stepperValue, { color: textColor }]}>
              {sets}
            </Text>
            <TouchableOpacity
              onPress={() => setSets((s) => s + 1)}
              style={[styles.stepperBtn, { borderColor }]}
              activeOpacity={0.6}
            >
              <Text style={[styles.stepperBtnText, { color: textColor }]}>
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reps */}
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <Text style={[styles.label, { color: subtitleText }]}>
            Reps per Set
          </Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              onPress={() => setReps((r) => Math.max(1, r - 1))}
              style={[styles.stepperBtn, { borderColor }]}
              activeOpacity={0.6}
            >
              <Text style={[styles.stepperBtnText, { color: textColor }]}>
                −
              </Text>
            </TouchableOpacity>
            <Text style={[styles.stepperValue, { color: textColor }]}>
              {reps}
            </Text>
            <TouchableOpacity
              onPress={() => setReps((r) => r + 1)}
              style={[styles.stepperBtn, { borderColor }]}
              activeOpacity={0.6}
            >
              <Text style={[styles.stepperBtnText, { color: textColor }]}>
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Default Weight */}
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <Text style={[styles.label, { color: subtitleText }]}>
            Default Weight
          </Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              onPress={() => setWeight((w) => Math.max(0, w - WEIGHT_STEP))}
              style={[styles.stepperBtn, { borderColor }]}
              activeOpacity={0.6}
              disabled={weight <= 0}
            >
              <Text
                style={[
                  styles.stepperBtnText,
                  { color: weight > 0 ? textColor : subtitleText },
                ]}
              >
                −
              </Text>
            </TouchableOpacity>
            <View style={styles.weightInputRow}>
              <TextInput
                style={[styles.weightInput, { color: textColor }]}
                value={weight > 0 ? String(weight) : ''}
                placeholder="0"
                placeholderTextColor={subtitleText}
                keyboardType="numeric"
                onChangeText={(t) => {
                  const parsed = parseFloat(t)
                  setWeight(isNaN(parsed) ? 0 : Math.max(0, parsed))
                }}
                selectTextOnFocus
              />
              <Text style={[styles.weightUnit, { color: subtitleText }]}>
                kg
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setWeight((w) => w + WEIGHT_STEP)}
              style={[styles.stepperBtn, { borderColor }]}
              activeOpacity={0.6}
            >
              <Text style={[styles.stepperBtnText, { color: textColor }]}>
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Variation */}
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <Text style={[styles.label, { color: subtitleText }]}>Variation</Text>
          <TextInput
            style={[styles.textInput, { color: textColor, borderColor }]}
            value={variation}
            onChangeText={setVariation}
            placeholder="e.g. Drop Set, 1.5 rep variation"
            placeholderTextColor={subtitleText}
            autoCapitalize="sentences"
          />
        </View>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: cardBackground }]}>
          <Ionicons
            name="barbell-outline"
            size={18}
            color={accentColor}
            style={styles.summaryIcon}
          />
          <Text style={[styles.summaryText, { color: textColor }]}>
            {sets} × {reps} reps{weight > 0 ? ` @ ${weight} kg` : ''}
            {variation.trim() ? ` · ${variation.trim()}` : ''}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnText: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
  },
  stepperValue: {
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 50,
    textAlign: 'center',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  weightInput: {
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 50,
    textAlign: 'center',
    padding: 0,
  },
  weightUnit: {
    fontSize: 16,
    fontWeight: '600',
  },
  textInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryIcon: {
    marginTop: 1,
  },
  summaryText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
})
