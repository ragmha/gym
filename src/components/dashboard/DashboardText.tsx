import React from 'react'
import {
  StyleSheet,
  Text,
  type TextProps,
  useWindowDimensions,
} from 'react-native'

import { Typography } from '@/constants/DesignSystem'

type DashboardTextProps = Omit<
  TextProps,
  'allowFontScaling' | 'maxFontSizeMultiplier'
>

export function DashboardText({ style, ...props }: DashboardTextProps) {
  const { fontScale } = useWindowDimensions()
  const resolved = StyleSheet.flatten(style)

  // Scale glyphs and line boxes together so live Dynamic Type changes remeasure.
  return (
    <Text
      {...props}
      allowFontScaling={false}
      style={[
        style,
        {
          fontSize:
            (resolved?.fontSize ?? Typography.bodySm.fontSize) * fontScale,
          lineHeight:
            resolved?.lineHeight === undefined
              ? undefined
              : resolved.lineHeight * fontScale,
        },
      ]}
    />
  )
}
