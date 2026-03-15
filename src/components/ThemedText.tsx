import { StyleSheet, Text, type TextProps } from 'react-native'

import { Typography } from '@/constants/DesignSystem'
import { useThemeColor } from '@/hooks/useThemeColor'

export type ThemedTextProps = TextProps & {
  lightColor?: string
  darkColor?: string
  type?:
    | 'default'
    | 'title'
    | 'defaultSemiBold'
    | 'subtitle'
    | 'link'
    | 'displayLg'
    | 'displayMd'
    | 'headingXl'
    | 'headingLg'
    | 'headingMd'
    | 'headingSm'
    | 'headingXs'
    | 'label'
    | 'labelSm'
    | 'numeric'
}

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor(
    { light: lightColor, dark: darkColor },
    type === 'link' ? 'accent' : 'text',
  )

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        type === 'displayLg' ? styles.displayLg : undefined,
        type === 'displayMd' ? styles.displayMd : undefined,
        type === 'headingXl' ? styles.headingXl : undefined,
        type === 'headingLg' ? styles.headingLg : undefined,
        type === 'headingMd' ? styles.headingMd : undefined,
        type === 'headingSm' ? styles.headingSm : undefined,
        type === 'headingXs' ? styles.headingXs : undefined,
        type === 'label' ? styles.label : undefined,
        type === 'labelSm' ? styles.labelSm : undefined,
        type === 'numeric' ? styles.numeric : undefined,
        style,
      ]}
      {...rest}
    />
  )
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
  },
  displayLg: Typography.displayLg,
  displayMd: Typography.displayMd,
  headingXl: Typography.headingXl,
  headingLg: Typography.headingLg,
  headingMd: Typography.headingMd,
  headingSm: Typography.headingSm,
  headingXs: Typography.headingXs,
  label: Typography.labelLg,
  labelSm: Typography.labelSm,
  numeric: Typography.numericMd,
})
