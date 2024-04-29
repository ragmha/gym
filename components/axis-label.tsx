import { useColors } from '@/hooks/use-colors'
import { Dimensions, View, Text } from 'react-native'

interface AxisLabelProps {
  value: number
  index: number
  arrayLength: number
}

export function AxisLabel({ value, index, arrayLength }: AxisLabelProps) {
  const colors = useColors()
  const location =
    (index / arrayLength) * (Dimensions.get('window').width - 40) || 0

  return (
    value && (
      <View style={{ transform: [{ translateX: Math.max(location - 40, 5) }] }}>
        <Text style={{ color: colors.background }}>{`${value.toFixed(
          6
        )}`}</Text>
      </View>
    )
  )
}
