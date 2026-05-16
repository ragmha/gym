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

import { useTheme } from '@/hooks/useThemeColor'
import { useWeightStore } from '@/stores/WeightStore'

const KG_TO_LBS = 2.20462

interface WeightGoalSheetProps {
  visible: boolean
  onClose: () => void
}

export function WeightGoalSheet({ visible, onClose }: WeightGoalSheetProps) {
  const { goalKg, unit, setGoal } = useWeightStore()

  const currentGoalDisplay =
    goalKg !== null
      ? unit === 'lbs'
        ? (goalKg * KG_TO_LBS).toFixed(1)
        : goalKg.toFixed(1)
      : ''

  const [inputValue, setInputValue] = useState(currentGoalDisplay)

  const {
    text: textColor,
    subtitleText: subtextColor,
    cardBackground: cardBg,
    accent: accentColor,
    border: borderColor,
  } = useTheme()

  const handleSave = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) {
      // Clear goal
      setGoal(null)
      onClose()
      return
    }

    const parsed = parseFloat(trimmed)
    if (Number.isNaN(parsed) || parsed <= 0 || parsed > 500) {
      if (Platform.OS === 'web') {
        alert('Please enter a valid weight goal.')
      } else {
        Alert.alert(
          'Invalid goal',
          'Please enter a valid weight between 1 and 500.',
        )
      }
      return
    }

    const kg = unit === 'lbs' ? parsed / KG_TO_LBS : parsed
    setGoal(kg)
    Keyboard.dismiss()
    onClose()
  }, [inputValue, unit, setGoal, onClose])

  const handleClear = useCallback(() => {
    setGoal(null)
    setInputValue('')
    onClose()
  }, [setGoal, onClose])

  // Reset input when sheet opens
  const handleShow = useCallback(() => {
    const display =
      goalKg !== null
        ? unit === 'lbs'
          ? (goalKg * KG_TO_LBS).toFixed(1)
          : goalKg.toFixed(1)
        : ''
    setInputValue(display)
  }, [goalKg, unit])

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: cardBg }]}
          onPress={Keyboard.dismiss}
        >
          <Text style={[styles.title, { color: textColor }]}>
            Set Weight Goal
          </Text>
          <Text style={[styles.subtitle, { color: subtextColor }]}>
            {goalKg !== null
              ? `Current goal: ${currentGoalDisplay} ${unit}`
              : 'No goal set'}
          </Text>

          <View style={[styles.inputRow, { borderColor }]}>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              placeholder={`Target weight (${unit})`}
              placeholderTextColor={subtextColor}
              keyboardType="decimal-pad"
              returnKeyType="done"
              value={inputValue}
              onChangeText={setInputValue}
              onSubmitEditing={handleSave}
              autoFocus
              accessibilityLabel={`Target weight in ${unit}`}
            />
            <Text style={[styles.unitLabel, { color: subtextColor }]}>
              {unit}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            {goalKg !== null && (
              <TouchableOpacity
                style={[styles.clearButton, { borderColor }]}
                onPress={handleClear}
                hitSlop={8}
              >
                <Text style={[styles.clearButtonText, { color: '#FF3B30' }]}>
                  Clear Goal
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor }]}
              onPress={onClose}
              hitSlop={8}
            >
              <Text style={[styles.cancelButtonText, { color: subtextColor }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: accentColor }]}
              onPress={handleSave}
              hitSlop={8}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  input: {
    flex: 1,
    fontSize: 18,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 'auto',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
})
