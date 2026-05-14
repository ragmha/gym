import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useMemo, useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useThemeColor } from '@/hooks/useThemeColor'
import { useMealStore } from '@/stores/MealStore'

function NumericField({
  label,
  unit,
  value,
  onChangeText,
  textColor,
  subtitleColor,
  cardBg,
}: {
  label: string
  unit: string
  value: string
  onChangeText: (v: string) => void
  textColor: string
  subtitleColor: string
  cardBg: string
}) {
  return (
    <View style={fieldStyles.row}>
      <Text style={[fieldStyles.label, { color: subtitleColor }]}>{label}</Text>
      <View style={[fieldStyles.input, { backgroundColor: cardBg }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          style={[fieldStyles.text, { color: textColor }]}
        />
        <Text style={[fieldStyles.unit, { color: subtitleColor }]}>{unit}</Text>
      </View>
    </View>
  )
}

const fieldStyles = StyleSheet.create({
  row: { marginBottom: 10 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  text: { flex: 1, fontSize: 16 },
  unit: { fontSize: 13 },
})

export default function EditMealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const cardBg = useThemeColor({}, 'cardBackground')
  const bg = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')
  const subtitleColor = useThemeColor({}, 'subtitleText')
  const accent = useThemeColor({}, 'accent')

  const { meals, updateMeal, deleteMeal } = useMealStore()
  const meal = useMemo(() => meals.find((m) => m.id === id), [meals, id])

  const [name, setName] = useState(meal?.name ?? '')
  const [calories, setCalories] = useState(String(meal?.caloriesKcal ?? 0))
  const [protein, setProtein] = useState(String(meal?.proteinG ?? 0))
  const [carb, setCarb] = useState(String(meal?.carbG ?? 0))
  const [fat, setFat] = useState(String(meal?.fatG ?? 0))

  if (!meal) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: bg }]}
        edges={['top']}
      >
        <View style={styles.center}>
          <Text style={{ color: textColor }}>Meal not found.</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: accent, marginTop: 12 }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  const handleSave = async () => {
    await updateMeal(meal.id, {
      name: name.trim() || meal.name,
      caloriesKcal: Number(calories) || 0,
      proteinG: Number(protein) || 0,
      carbG: Number(carb) || 0,
      fatG: Number(fat) || 0,
    })
    router.back()
  }

  const handleDelete = () => {
    Alert.alert('Delete meal?', `Remove "${meal.name}" from today?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMeal(meal.id)
          router.back()
        },
      },
    ])
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: bg }]}
      edges={['top']}
    >
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={textColor} />
        </Pressable>
        <Text style={[styles.title, { color: textColor }]}>Edit meal</Text>
        <Pressable onPress={handleDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.label, { color: subtitleColor }]}>Name</Text>
        <View
          style={[
            fieldStyles.input,
            { backgroundColor: cardBg, marginBottom: 16 },
          ]}
        >
          <TextInput
            value={name}
            onChangeText={setName}
            style={[fieldStyles.text, { color: textColor }]}
            placeholder="Meal name"
            placeholderTextColor={subtitleColor}
          />
        </View>

        <NumericField
          label="Calories"
          unit="kcal"
          value={calories}
          onChangeText={setCalories}
          textColor={textColor}
          subtitleColor={subtitleColor}
          cardBg={cardBg}
        />
        <NumericField
          label="Protein"
          unit="g"
          value={protein}
          onChangeText={setProtein}
          textColor={textColor}
          subtitleColor={subtitleColor}
          cardBg={cardBg}
        />
        <NumericField
          label="Carbs"
          unit="g"
          value={carb}
          onChangeText={setCarb}
          textColor={textColor}
          subtitleColor={subtitleColor}
          cardBg={cardBg}
        />
        <NumericField
          label="Fat"
          unit="g"
          value={fat}
          onChangeText={setFat}
          textColor={textColor}
          subtitleColor={subtitleColor}
          cardBg={cardBg}
        />

        {meal.aiConfidence !== null && (
          <Text style={[styles.confidence, { color: subtitleColor }]}>
            AI confidence: {Math.round(meal.aiConfidence * 100)}%
          </Text>
        )}

        <Pressable
          onPress={handleSave}
          style={[styles.primary, { backgroundColor: accent }]}
        >
          <Text style={styles.primaryText}>Save</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 18, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 80 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  primary: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  confidence: { fontSize: 12, marginTop: 12, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
