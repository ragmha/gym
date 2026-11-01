import React from 'react'
import { StyleSheet, Text, TextStyle, View } from 'react-native'

import { CircularProgress } from '@/components/common/CircularProgress'
import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

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
  circleBackgroundColor,
}: ProgressCardProps) {
  const theme = useTheme()
  const percentage = Math.round(progress * 100)
  const resolvedTextColor = textColor ?? theme.text

  const progressTextStyle: TextStyle = {
    ...styles.percentage,
    color: resolvedTextColor,
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: cardBackgroundColor ?? theme.cardBackground },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: resolvedTextColor }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.subtitleText }]}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={styles.progressContainer}>
          <CircularProgress
            value={percentage}
            radius={progressCircleSize / 2}
            duration={1000}
            activeStrokeWidth={strokeWidth}
            inActiveStrokeWidth={strokeWidth}
            maxValue={100}
            activeStrokeColor={progressColor ?? theme.accent}
            inActiveStrokeColor={circleBackgroundColor ?? theme.goalTrack}
          >
            <Text style={progressTextStyle}>{percentage}%</Text>
          </CircularProgress>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
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
    ...Typography.headingSm,
    marginBottom: Spacing.xxs,
  },
  subtitle: {
    ...Typography.bodySm,
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    ...Typography.labelMd,
  },
})
