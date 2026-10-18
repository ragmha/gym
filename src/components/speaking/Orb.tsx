import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'

export function Orb({
  colors,
  size,
  id,
}: {
  colors: [string, string]
  size: number
  id: string
}) {
  const r = size / 2
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id={`orb-${id}`} x1="0.2" y1="0" x2="0.6" y2="1">
          <Stop offset="0.35" stopColor={colors[0]} />
          <Stop offset="1" stopColor={colors[1]} />
        </LinearGradient>
      </Defs>
      <Circle cx={r} cy={r} r={r} fill={`url(#orb-${id})`} />
    </Svg>
  )
}
