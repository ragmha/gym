import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { Radii, Spacing, Typography } from '@/constants/DesignSystem'
import { useTheme } from '@/hooks/useThemeColor'

interface TooltipBubbleProps {
  title?: string
  message: string
}

export function TooltipBubble({ title, message }: TooltipBubbleProps) {
  const {
    surfaceElevated: surface,
    text,
    subtitleText: subtitle,
    border,
  } = useTheme()

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.container,
          { backgroundColor: surface, borderColor: border },
        ]}
      >
        {title ? (
          <Text style={[styles.title, { color: text }]}>{title}</Text>
        ) : null}
        <Text style={[styles.message, { color: subtitle }]}>{message}</Text>
      </View>
      <View style={[styles.pointer, { borderTopColor: surface }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'flex-start',
  },
  container: {
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxWidth: 320,
  },
  title: {
    ...Typography.headingXs,
    marginBottom: 4,
  },
  message: {
    ...Typography.bodySm,
  },
  pointer: {
    marginLeft: 18,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
})
