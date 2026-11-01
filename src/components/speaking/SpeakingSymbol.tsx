import { View } from 'react-native'
import Svg, { Path } from 'react-native-svg'
import { useTheme } from '@/hooks/useThemeColor'

export function SpeakingSymbol({ size }: { size: number }) {
  const theme = useTheme()
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 100 100" focusable={false}>
        <Path
          d="M50 22a12 12 0 0 0-12 12v17a12 12 0 0 0 24 0V34a12 12 0 0 0-12-12ZM28 49a22 22 0 0 0 44 0M50 71v11M39 82h22"
          fill="none"
          stroke={theme.text}
          strokeWidth={2}
          strokeDasharray="0.05 1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}
