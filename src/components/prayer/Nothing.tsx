import { Ionicons } from '@expo/vector-icons'
import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'

import { DashboardText } from '@/components/dashboard/DashboardText'
import { useColorScheme } from '@/hooks/useColorScheme'

/**
 * Nothing-style tokens for the prayer screens only (DESIGN.md exception):
 * monochrome, Doto for hero numbers, Orbitron for the city clock,
 * Space Grotesk text, Space Mono labels.
 */
const PALETTES = {
  light: {
    bg: '#EAE9E6',
    surface: '#F5F4F1',
    border: '#D6D5D1',
    borderVisible: '#B9B8B4',
    disabled: '#A3A29E',
    secondary: '#6B6A67',
    primary: '#1A1A1A',
    display: '#000000',
    inverse: '#FFFFFF',
    accent: '#D71921',
  },
  dark: {
    bg: '#000000',
    surface: '#111111',
    border: '#222222',
    borderVisible: '#333333',
    disabled: '#666666',
    secondary: '#999999',
    primary: '#E8E8E8',
    display: '#FFFFFF',
    inverse: '#000000',
    accent: '#D71921',
  },
}
export type NothingPalette = (typeof PALETTES)['light']

export const FONTS = {
  display: 'Doto_700Bold',
  clock: 'Orbitron_900Black',
  clockLabel: 'Orbitron_500Medium',
  body: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  mono: 'SpaceMono',
}

export function useNothing(): NothingPalette {
  return PALETTES[useColorScheme()]
}

export function Label({
  children,
  color,
  style,
}: {
  children: React.ReactNode
  color?: string
  style?: StyleProp<TextStyle>
}) {
  const p = useNothing()
  return (
    <DashboardText
      style={[styles.label, { color: color ?? p.secondary }, style]}
    >
      {children}
    </DashboardText>
  )
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  const p = useNothing()
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.segmented, { borderColor: p.borderVisible }]}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: p.display }]}
          >
            <Label color={selected ? p.inverse : p.secondary}>
              {option.label}
            </Label>
          </Pressable>
        )
      })}
    </View>
  )
}

export function CircleButton({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name']
  label: string
  onPress?: () => void
  active?: boolean
}) {
  const p = useNothing()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.circle,
        {
          backgroundColor: active ? p.display : p.surface,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={active ? p.inverse : p.primary} />
    </Pressable>
  )
}

export function PillButton({
  label,
  onPress,
  disabled = false,
  primary = false,
  style,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  primary?: boolean
  style?: StyleProp<ViewStyle>
}) {
  const p = useNothing()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          borderColor: primary ? p.display : p.borderVisible,
          backgroundColor: primary ? p.display : 'transparent',
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Label color={primary ? p.inverse : p.primary} style={styles.pillText}>
        {label}
      </Label>
    </Pressable>
  )
}

/** Square segments with 2px gaps; filled ones use the display colour. */
export function SegmentBar({
  total,
  filled,
}: {
  total: number
  filled: number
}) {
  const p = useNothing()
  return (
    <View style={styles.bar} accessible={false}>
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.block,
            { backgroundColor: index < filled ? p.display : p.border },
          ]}
        />
      ))}
    </View>
  )
}

export function Divider() {
  const p = useNothing()
  return <View style={[styles.divider, { backgroundColor: p.border }]} />
}

const styles = StyleSheet.create({
  label: {
    fontFamily: FONTS.mono,
    fontSize: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 3,
  },
  segment: {
    minHeight: 48,
    minWidth: 40,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: { fontSize: 13 },
  bar: { flexDirection: 'row', gap: 2 },
  block: { flex: 1, height: 10 },
  divider: { height: 1 },
})
