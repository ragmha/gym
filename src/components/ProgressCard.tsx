import React from 'react'
import { StyleSheet, Text, TextStyle, View } from 'react-native'
import CircularProgress from 'react-native-circular-progress-indicator'

interface ProgressCardProps {
  title?: string
  subtitle?: string
  progress?: number
  progressColor?: string
  cardBackgroundColor?: string
  textColor?: string
  strokeWidth?: number
  progressCircleSize?: number
  circleBackgroundColor?: string
}

export function ProgressCard({
  title = 'Progress',
  subtitle,
  progress = 0,
  progressColor = '#007AFF',
  cardBackgroundColor,
  textColor,
  strokeWidth = 8,
  progressCircleSize = 50,
  circleBackgroundColor = '#333',
}: ProgressCardProps) {
  const percentage = Math.round(progress * 100)

  const progressTextStyle: TextStyle = {
    ...styles.percentage,
    ...(textColor ? { color: textColor } : {}),
  }

  return (
    <View
      style={[
        styles.container,
        cardBackgroundColor ? { backgroundColor: cardBackgroundColor } : {},
      ]}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, textColor ? { color: textColor } : {}]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, textColor ? { color: textColor } : {}]}
            >
              {subtitle}
            </Text>
          )}
        </View>
        <View style={styles.progressContainer}>
          <CircularProgress
            value={percentage}
            radius={progressCircleSize / 2}
            duration={1000}
            valueSuffix="%"
            activeStrokeWidth={strokeWidth}
            inActiveStrokeWidth={strokeWidth}
            progressValueColor={textColor}
            maxValue={100}
            activeStrokeColor={progressColor}
            inActiveStrokeColor={circleBackgroundColor}
            progressValueStyle={progressTextStyle}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontSize: 12,
    fontWeight: '600',
  },
})
