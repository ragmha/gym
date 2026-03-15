import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useCallback, useState } from 'react'
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Chip } from '@/components/ui/Chip'
import { Radii, Typography } from '@/constants/DesignSystem'
import { useColorScheme } from '@/hooks/useColorScheme'
import { useTheme } from '@/hooks/useThemeColor'
import { useHydrationStore, useTodayHydration } from '@/stores/HydrationStore'

// ── Design tokens ────────────────────────────────────────────────────

const QUICK_ADD_PRESETS = [250, 500, 750, 1000] as const
const HYDRATION_ICON = '#20263A'

// ── Water-level visualisation ────────────────────────────────────────

function WaterLevel({
  progress,
  goalMl,
  currentMl,
  surfaceColor,
  primaryText,
  secondaryText,
  fillColor,
  fillTextColor,
}: {
  progress: number
  goalMl: number
  currentMl: number
  surfaceColor: string
  primaryText: string
  secondaryText: string
  fillColor: string
  fillTextColor: string
}) {
  const animatedHeight = useSharedValue(progress)

  React.useEffect(() => {
    animatedHeight.value = withSpring(progress, {
      damping: 14,
      stiffness: 80,
    })
  }, [animatedHeight, progress])

  const fillStyle = useAnimatedStyle(() => ({
    height: `${animatedHeight.value * 100}%`,
  }))

  return (
    <View style={[wlStyles.container, { backgroundColor: surfaceColor }]}>
      {/* Goal label — top left */}
      <View style={wlStyles.goalLabel}>
        <Text style={[wlStyles.goalLabelTitle, { color: secondaryText }]}>
          Goal
        </Text>
        <Text style={[wlStyles.goalLabelValue, { color: primaryText }]}>
          {goalMl}ml
        </Text>
      </View>

      {/* Water fill — anchored to bottom */}
      <View style={wlStyles.fillTrack}>
        <Animated.View
          style={[wlStyles.fillBar, fillStyle, { backgroundColor: fillColor }]}
        >
          {/* Current label — top right of fill */}
          <View style={wlStyles.currentLabel}>
            <Text style={wlStyles.currentLabelTitle}>Current</Text>
            <Text
              style={[wlStyles.currentLabelValue, { color: fillTextColor }]}
            >
              {currentMl}ml
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  )
}

const wlStyles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    marginHorizontal: 24,
  },
  goalLabel: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 2,
  },
  goalLabelTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  goalLabelValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  fillTrack: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  fillBar: {
    borderRadius: 20,
    width: '100%',
    minHeight: 80,
    position: 'relative',
  },
  currentLabel: {
    position: 'absolute',
    top: 14,
    right: 20,
  },
  currentLabelTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'right',
  },
  currentLabelValue: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 2,
  },
})

// ── Main Screen ──────────────────────────────────────────────────────

export default function HydrationScreen() {
  const router = useRouter()
  const colorScheme = useColorScheme()
  const { todayEntries, totalMl, goalMl, progress } = useTodayHydration()
  const { quickAddMl, addEntry, removeEntry, setGoal, setQuickAdd } =
    useHydrationStore()
  const {
    background: backgroundColor,
    text: primaryText,
    subtitleText: secondaryText,
    cardSurface: surfaceColor,
    surfaceElevated: elevatedSurface,
    border: borderColor,
    info: hydrationColor,
    selectedText,
  } = useTheme()

  const [showSettings, setShowSettings] = useState(false)
  const [goalInput, setGoalInput] = useState('')
  const [quickAddInput, setQuickAddInput] = useState('')

  // Button scale animation
  const buttonScale = useSharedValue(1)
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }))
  const canDecrease = todayEntries.length > 0
  const lastLoggedEntry = canDecrease
    ? todayEntries[todayEntries.length - 1]
    : null

  const handleAdd = useCallback(() => {
    buttonScale.value = withTiming(0.9, { duration: 80 }, () => {
      buttonScale.value = withSpring(1, { damping: 10, stiffness: 200 })
    })
    addEntry(quickAddMl)
  }, [addEntry, buttonScale, quickAddMl])

  const handleDecrease = useCallback(() => {
    if (!lastLoggedEntry) {
      return
    }

    buttonScale.value = withTiming(0.94, { duration: 80 }, () => {
      buttonScale.value = withSpring(1, { damping: 10, stiffness: 200 })
    })
    removeEntry(lastLoggedEntry.id)
  }, [buttonScale, lastLoggedEntry, removeEntry])

  const openSettings = useCallback(() => {
    setGoalInput(String(goalMl))
    setQuickAddInput(String(quickAddMl))
    setShowSettings(true)
  }, [goalMl, quickAddMl])

  const saveSettings = useCallback(() => {
    const parsedGoal = parseInt(goalInput.trim(), 10)
    const parsedQuick = parseInt(quickAddInput.trim(), 10)

    if (Number.isNaN(parsedGoal) || parsedGoal <= 0 || parsedGoal > 10_000) {
      const msg = 'Enter a valid goal (1 – 10,000 ml).'
      if (Platform.OS === 'web') {
        alert(msg)
      } else {
        Alert.alert('Invalid goal', msg)
      }
      return
    }
    if (Number.isNaN(parsedQuick) || parsedQuick <= 0 || parsedQuick > 5_000) {
      const msg = 'Enter a valid quick-add amount (1 – 5,000 ml).'
      if (Platform.OS === 'web') {
        alert(msg)
      } else {
        Alert.alert('Invalid amount', msg)
      }
      return
    }

    setGoal(parsedGoal)
    setQuickAdd(parsedQuick)
    setShowSettings(false)
    Keyboard.dismiss()
  }, [goalInput, quickAddInput, setGoal, setQuickAdd])

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: elevatedSurface }]}
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityLabel="Go back"
            accessibilityHint="Returns to the previous screen"
          >
            <Ionicons name="chevron-back" size={22} color={primaryText} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: primaryText }]}>
            Hydration
          </Text>

          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: elevatedSurface }]}
            onPress={openSettings}
            hitSlop={12}
            accessibilityLabel="Open hydration settings"
            accessibilityHint="Adjusts your goal and quick-add amount"
          >
            <Ionicons name="settings-outline" size={20} color={secondaryText} />
          </TouchableOpacity>
        </View>

        {/* ── Hero display ────────────────────────────────── */}
        <View style={styles.heroSection}>
          <View style={styles.heroRow}>
            <Text style={styles.droplet}>💧</Text>
            <Text style={[styles.heroValue, { color: primaryText }]}>
              {totalMl}
            </Text>
            <Text style={[styles.heroUnit, { color: secondaryText }]}>
              / {goalMl} ml
            </Text>
          </View>
        </View>

        {/* Quick-add chips */}
        <View style={styles.quickAddChips}>
          {QUICK_ADD_PRESETS.map((preset) => (
            <Chip
              key={preset}
              label={`${preset}ml`}
              tone="info"
              selected={quickAddMl === preset}
              onPress={() => setQuickAdd(preset)}
            />
          ))}
        </View>

        {/* ── Water level visualisation ───────────────────── */}
        <WaterLevel
          progress={progress}
          goalMl={goalMl}
          currentMl={totalMl}
          surfaceColor={surfaceColor}
          primaryText={primaryText}
          secondaryText={secondaryText}
          fillColor={hydrationColor}
          fillTextColor={selectedText}
        />

        {/* ── Add button ──────────────────────────────────── */}
        <View style={[styles.addSection, { backgroundColor: hydrationColor }]}>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.secondaryActionButton,
                {
                  backgroundColor: canDecrease
                    ? 'rgba(255,255,255,0.18)'
                    : 'rgba(255,255,255,0.08)',
                  borderColor: canDecrease
                    ? 'rgba(255,255,255,0.24)'
                    : 'rgba(255,255,255,0.12)',
                },
              ]}
              onPress={handleDecrease}
              activeOpacity={0.8}
              disabled={!canDecrease}
              accessibilityLabel="Decrease water"
              accessibilityHint="Removes your most recent hydration entry"
            >
              <Ionicons
                name="remove"
                size={26}
                color={canDecrease ? selectedText : 'rgba(255,255,255,0.45)'}
              />
            </TouchableOpacity>

            <Animated.View style={buttonAnimStyle}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: selectedText }]}
                onPress={handleAdd}
                activeOpacity={0.8}
                accessibilityLabel="Add water"
                accessibilityHint="Adds the selected quick add amount"
              >
                <Ionicons name="add" size={32} color={HYDRATION_ICON} />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </SafeAreaView>

      {/* ── Settings modal ────────────────────────────────── */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowSettings(false)}
        >
          <Pressable
            style={[styles.modalSheet, { backgroundColor: surfaceColor }]}
            onPress={Keyboard.dismiss}
          >
            <Text style={[styles.modalTitle, { color: primaryText }]}>
              Hydration Settings
            </Text>

            <Text style={[styles.inputLabel, { color: secondaryText }]}>
              Daily Goal (ml)
            </Text>
            <TextInput
              style={[styles.modalInput, { color: primaryText, borderColor }]}
              placeholder="e.g. 2000"
              placeholderTextColor={secondaryText}
              keyboardType="number-pad"
              returnKeyType="next"
              value={goalInput}
              onChangeText={setGoalInput}
              selectTextOnFocus
            />

            <Text style={[styles.inputLabel, { color: secondaryText }]}>
              Quick-add Amount (ml)
            </Text>
            <TextInput
              style={[styles.modalInput, { color: primaryText, borderColor }]}
              placeholder="e.g. 250"
              placeholderTextColor={secondaryText}
              keyboardType="number-pad"
              returnKeyType="done"
              value={quickAddInput}
              onChangeText={setQuickAddInput}
              onSubmitEditing={saveSettings}
              selectTextOnFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor }]}
                onPress={() => setShowSettings(false)}
              >
                <Text
                  style={[styles.modalCancelText, { color: secondaryText }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: hydrationColor }]}
                onPress={saveSettings}
              >
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // ── Hero ──────────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  droplet: {
    fontSize: 28,
    marginRight: 8,
  },
  heroValue: {
    ...Typography.displayLg,
  },
  heroUnit: {
    fontSize: 22,
    fontWeight: '500',
    marginLeft: 6,
  },
  quickAddChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
    marginBottom: 16,
  },

  // ── Add button ────────────────────────────────────────────────
  addSection: {
    alignItems: 'center',
    paddingVertical: 24,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    marginTop: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  secondaryActionButton: {
    width: 56,
    height: 56,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addButton: {
    width: 64,
    height: 64,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // ── Settings modal ────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    fontSize: 22,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  modalCancel: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalSave: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
})
