import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useMemo } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useThemeColor } from '@/hooks/useThemeColor'
import { useDailyNutrition, useMealStore, type Meal } from '@/stores/MealStore'

function MacroBar({
  label,
  used,
  target,
  unit,
  color,
  textColor,
  subtitleColor,
}: {
  label: string
  used: number
  target: number
  unit: string
  color: string
  textColor: string
  subtitleColor: string
}) {
  const ratio = Math.min(target > 0 ? used / target : 0, 1)
  return (
    <View style={macroBarStyles.row}>
      <View style={macroBarStyles.labels}>
        <Text style={[macroBarStyles.label, { color: textColor }]}>
          {label}
        </Text>
        <Text style={[macroBarStyles.values, { color: subtitleColor }]}>
          {Math.round(used)}
          {unit} / {target}
          {unit}
        </Text>
      </View>
      <View style={[macroBarStyles.track, { backgroundColor: `${color}20` }]}>
        <View
          style={[
            macroBarStyles.fill,
            { backgroundColor: color, width: `${ratio * 100}%` },
          ]}
        />
      </View>
    </View>
  )
}

const macroBarStyles = StyleSheet.create({
  row: { marginBottom: 12 },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: { fontSize: 13, fontWeight: '600' },
  values: { fontSize: 12 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
})

function MealRow({
  meal,
  onPress,
  textColor,
  subtitleColor,
  cardBg,
}: {
  meal: Meal
  onPress: () => void
  textColor: string
  subtitleColor: string
  cardBg: string
}) {
  const sourceIcon: Record<Meal['source'], keyof typeof Ionicons.glyphMap> = {
    photo: 'camera',
    barcode: 'barcode',
    manual: 'create',
  }
  return (
    <Pressable
      onPress={onPress}
      style={[mealRowStyles.row, { backgroundColor: cardBg }]}
    >
      <View style={mealRowStyles.icon}>
        <Ionicons
          name={sourceIcon[meal.source]}
          size={18}
          color={subtitleColor}
        />
      </View>
      <View style={mealRowStyles.body}>
        <Text
          style={[mealRowStyles.title, { color: textColor }]}
          numberOfLines={1}
        >
          {meal.name}
        </Text>
        <Text style={[mealRowStyles.macros, { color: subtitleColor }]}>
          {Math.round(meal.proteinG)}p · {Math.round(meal.carbG)}c ·{' '}
          {Math.round(meal.fatG)}f
        </Text>
      </View>
      <Text style={[mealRowStyles.kcal, { color: textColor }]}>
        {Math.round(meal.caloriesKcal)}
        <Text style={[mealRowStyles.kcalUnit, { color: subtitleColor }]}>
          {' '}
          kcal
        </Text>
      </Text>
    </Pressable>
  )
}

const mealRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  macros: { fontSize: 12 },
  kcal: { fontSize: 16, fontWeight: '700' },
  kcalUnit: { fontSize: 12, fontWeight: '400' },
})

export default function NutritionScreen() {
  const router = useRouter()
  const cardBg = useThemeColor({}, 'cardBackground')
  const bg = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')
  const subtitleColor = useThemeColor({}, 'subtitleText')
  const accent = useThemeColor({}, 'accent')

  const { initialized } = useMealStore()
  const today = useDailyNutrition()

  const headerSubtitle = useMemo(() => {
    if (today.meals.length === 0) return 'No meals logged yet today'
    const remaining = Math.max(today.remaining.caloriesKcal, 0)
    if (remaining === 0) return 'Daily target reached 🎯'
    return `${Math.round(remaining)} kcal remaining`
  }, [today])

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: bg }]}
      edges={['top']}
    >
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>Nutrition</Text>
        <Text style={[styles.subtitle, { color: subtitleColor }]}>
          {headerSubtitle}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: cardBg }]}>
        <View style={styles.totalsRow}>
          <View>
            <Text style={[styles.totalKcal, { color: textColor }]}>
              {Math.round(today.totals.caloriesKcal)}
            </Text>
            <Text style={[styles.totalUnit, { color: subtitleColor }]}>
              of {today.targets.caloriesKcal} kcal
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/nutrition/scan')}
            style={[styles.cta, { backgroundColor: accent }]}
            accessibilityLabel="Add meal"
          >
            <Ionicons name="add" size={22} color="#fff" />
            <Text style={styles.ctaText}>Add meal</Text>
          </Pressable>
        </View>

        <View style={styles.macros}>
          <MacroBar
            label="Protein"
            used={today.totals.proteinG}
            target={today.targets.proteinG}
            unit="g"
            color="#22c55e"
            textColor={textColor}
            subtitleColor={subtitleColor}
          />
          <MacroBar
            label="Carbs"
            used={today.totals.carbG}
            target={today.targets.carbG}
            unit="g"
            color="#f59e0b"
            textColor={textColor}
            subtitleColor={subtitleColor}
          />
          <MacroBar
            label="Fat"
            used={today.totals.fatG}
            target={today.targets.fatG}
            unit="g"
            color="#a855f7"
            textColor={textColor}
            subtitleColor={subtitleColor}
          />
        </View>
      </View>

      <Text style={[styles.section, { color: subtitleColor }]}>Today</Text>

      <FlatList
        data={today.meals}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <MealRow
            meal={item}
            cardBg={cardBg}
            textColor={textColor}
            subtitleColor={subtitleColor}
            onPress={() =>
              router.push({
                pathname: '/nutrition/edit/[id]',
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          initialized ? (
            <View style={[styles.empty, { backgroundColor: cardBg }]}>
              <Ionicons
                name="restaurant-outline"
                size={28}
                color={subtitleColor}
              />
              <Text style={[styles.emptyTitle, { color: textColor }]}>
                Snap your first meal
              </Text>
              <Text style={[styles.emptyBody, { color: subtitleColor }]}>
                Tap “Add meal” to capture a photo, scan a barcode, or enter
                nutrition manually.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalKcal: { fontSize: 36, fontWeight: '700' },
  totalUnit: { fontSize: 13, marginTop: 2 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 4,
  },
  ctaText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  macros: { marginTop: 4 },
  section: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  empty: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  emptyBody: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
})
