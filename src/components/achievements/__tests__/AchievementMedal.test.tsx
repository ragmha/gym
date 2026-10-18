import { render, screen } from '@testing-library/react-native'
import { StyleSheet } from 'react-native'
import {
  ClipPath,
  G,
  LinearGradient,
  Path,
  Text as SvgText,
} from 'react-native-svg'

import { AchievementMedal } from '@/components/achievements/AchievementMedal'
import { Colors, type ThemeName } from '@/constants/Colors'
import type { BadgeArtwork } from '@/lib/achievements'

let mockTheme: ThemeName = 'light'
const artworks: BadgeArtwork[] = [
  'steps',
  'running',
  'stairs',
  'workout',
  'energy',
  'lifting',
  'water',
  'streak',
  'trophy',
]

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } =
    jest.requireActual<typeof import('@/constants/Colors')>(
      '@/constants/Colors',
    )
  return { useTheme: () => Colors[mockTheme] }
})

describe.each(['light', 'dark'] as const)('%s achievement medals', (theme) => {
  beforeEach(() => {
    mockTheme = theme
  })

  it.each(artworks)(
    'renders %s as colored enamel when earned and linework when locked',
    (art) => {
      const result = render(<AchievementMedal art={art} mark="7" earned />)
      expect(
        result
          .UNSAFE_getAllByType(Path)
          .some(
            (path) =>
              typeof path.props.fill === 'string' &&
              path.props.fill.startsWith('url(#medal-face-'),
          ),
      ).toBe(true)
      expect(result.UNSAFE_getByType(SvgText).props.children).toBe('7')
      result.rerender(<AchievementMedal art={art} mark="7" earned={false} />)
      expect(
        result
          .UNSAFE_getAllByType(G)
          .some((group) => group.props.stroke === Colors[theme].disabled),
      ).toBe(true)
      const paintedFills = result
        .UNSAFE_getAllByType(Path)
        .map((path) => path.props.fill)
        .filter((fill) => fill !== undefined)
      expect(new Set(paintedFills)).toEqual(
        new Set(['none', Colors[theme].background]),
      )
    },
  )

  it('keeps the artwork decorative and responsive', () => {
    render(<AchievementMedal art="steps" earned />)
    const artwork = screen.getByTestId('achievement-medal-art', {
      includeHiddenElements: true,
    })
    expect(artwork).toHaveProp('accessibilityElementsHidden', true)
    expect(artwork).toHaveProp(
      'importantForAccessibility',
      'no-hide-descendants',
    )
    expect(StyleSheet.flatten(artwork.props.style)).toMatchObject({
      width: '100%',
      maxWidth: 108,
      aspectRatio: 120 / 124,
    })
  })

  it('uses distinct gradient IDs for each medal in the grid', () => {
    const result = render(
      <>
        <AchievementMedal art="steps" earned />
        <AchievementMedal art="lifting" earned={false} />
      </>,
    )
    const ids = result
      .UNSAFE_getAllByType(LinearGradient)
      .map((gradient) => gradient.props.id)
    expect(ids).toHaveLength(6)
    expect(new Set(ids).size).toBe(6)
    const clips = result
      .UNSAFE_getAllByType(ClipPath)
      .map((clip) => clip.props.id)
    expect(new Set(clips).size).toBe(2)
  })
})
