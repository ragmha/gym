import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useThemeColor } from '@/hooks/useThemeColor'

interface CardioProps {
  morning: number
  evening: number
}

export const CardioDetails: React.FC<CardioProps> = ({ morning, evening }) => {
  const [isMorningChecked, setIsMorningChecked] = useState(false)
  const [isEveningChecked, setIsEveningChecked] = useState(false)

  const toggleMorningCheckbox = () => {
    setIsMorningChecked(!isMorningChecked)
  }

  const toggleEveningCheckbox = () => {
    setIsEveningChecked(!isEveningChecked)
  }

  const backgroundColor = useThemeColor({}, 'background')
  const textColor = useThemeColor({}, 'text')
  const shadowColor = useThemeColor({}, 'shadow')

  return (
    <View style={[styles.container, { backgroundColor, shadowColor }]}>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={toggleMorningCheckbox}
        >
          <View
            style={[
              styles.checkboxInner,
              isMorningChecked && styles.checkboxChecked,
            ]}
          />
        </TouchableOpacity>
        <Text style={[styles.label, { color: textColor }]}>Morning:</Text>
        <Text style={[styles.value, { color: textColor }]}>{morning} min</Text>
      </View>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={toggleEveningCheckbox}
        >
          <View
            style={[
              styles.checkboxInner,
              isEveningChecked && styles.checkboxChecked,
            ]}
          />
        </TouchableOpacity>
        <Text style={[styles.label, { color: textColor }]}>Evening:</Text>
        <Text style={[styles.value, { color: textColor }]}>{evening} min</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  label: {},
  value: {
    flex: 1,
    fontSize: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
})
