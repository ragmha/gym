import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ProgressCircle } from 'react-native-svg-charts'

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
  progressColor,
  cardBackgroundColor,
  textColor,
  strokeWidth = 8,
  progressCircleSize = 50,
  circleBackgroundColor = '#333',
}: ProgressCardProps) {
  const percentage = Math.round(progress * 100)

  return (
    <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: textColor }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={styles.progressContainer}>
        <ProgressCircle
          style={[
            styles.progressCircle,
            { height: progressCircleSize, width: progressCircleSize },
          ]}
          progress={progress}
          progressColor={progressColor}
          backgroundColor={circleBackgroundColor}
          strokeWidth={strokeWidth}
        />
        <View style={styles.progressTextContainer}>
          <Text style={[styles.percentageText, { color: textColor }]}>
            {percentage}%
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  progressContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    // height and width are now controlled via props
  },
  progressTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
})
