import { useId } from 'react'
import { StyleSheet, View } from 'react-native'
import Svg, {
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg'

import { AchievementMedalColors } from '@/constants/Colors'
import { useTheme } from '@/hooks/useThemeColor'
import type { BadgeArtwork } from '@/lib/achievements'

type EnamelFill = 'accent' | 'detail' | 'metal' | 'highlight' | 'none'
type Artwork = {
  shape: string
  layers: { d: string; fill: EnamelFill }[]
}

const ARTWORKS: Record<BadgeArtwork, Artwork> = {
  steps: {
    shape: 'M60 5 105 29V85L60 115 15 85V29Z',
    layers: [
      { d: 'M15 70 60 48 105 63V85L60 115 15 85Z', fill: 'detail' },
      {
        d: 'M28 40C37 40 38 55 50 56L67 45 77 62 95 70V83H25C18 83 17 75 19 70L27 55Z',
        fill: 'accent',
      },
      { d: 'M28 40 41 56 35 70H22L27 55Z', fill: 'detail' },
      { d: 'M51 56 64 63M58 51 70 59M35 70H52', fill: 'none' },
      { d: 'M21 75H95V84H26C21 84 19 80 21 75Z', fill: 'highlight' },
      {
        d: 'm78 20 2 5 6 1-4 4 1 6-5-3-5 3 1-6-4-4 6-1Z',
        fill: 'metal',
      },
    ],
  },
  running: {
    shape:
      'M17 48 5 23 39 34 59 7 80 29 113 23 105 53 115 80 89 88 60 113 34 92 9 90 17 68Z',
    layers: [
      { d: 'M32 53 24 25 46 34 41 20 66 41 50 61Z', fill: 'accent' },
      { d: 'M33 36 50 47M44 34 57 44', fill: 'none' },
      {
        d: 'M37 48C46 48 48 61 59 61L72 52 80 67 102 75V85H31C23 85 22 77 26 71Z',
        fill: 'highlight',
      },
      { d: 'M37 48 49 62 42 73H26Z', fill: 'detail' },
      { d: 'M57 61 68 67M63 57 75 65M24 79H102', fill: 'none' },
      { d: 'M11 57H24M10 64H22', fill: 'none' },
    ],
  },
  stairs: {
    shape: 'M60 5 109 41 99 96 60 115 21 96 11 41Z',
    layers: [
      {
        d: 'M77 26a10 10 0 1 1 0 20a10 10 0 1 1 0-20Z',
        fill: 'metal',
      },
      {
        d: 'M15 76 45 33 65 59 80 45 104 77 99 96 60 115 21 96Z',
        fill: 'accent',
      },
      { d: 'M34 49 45 33 57 49 48 46 42 51Z', fill: 'highlight' },
      { d: 'M19 87 63 64 100 89 99 96 60 115 21 96Z', fill: 'detail' },
      { d: 'M32 87H47V75H59V63H71V51', fill: 'none' },
    ],
  },
  workout: {
    shape: 'M47 5H73V14H67V23A44 44 0 1 1 53 23V14H47Z',
    layers: [
      { d: 'M52 7H68V16H52Z', fill: 'metal' },
      { d: 'M60 32a33 33 0 1 1 0 66a33 33 0 1 1 0-66Z', fill: 'detail' },
      { d: 'M60 38V44M33 65H39M81 65H87M60 86V92', fill: 'none' },
      { d: 'M57 47H63V64L78 74 74 79 57 68Z', fill: 'accent' },
      { d: 'M60 61a4 4 0 1 1 0 8a4 4 0 1 1 0-8Z', fill: 'metal' },
    ],
  },
  energy: {
    shape:
      'M62 5C68 28 97 34 92 62C103 54 106 50 105 39C126 65 111 110 73 114C35 118 8 97 13 69C17 48 32 37 43 20C39 45 49 46 56 35C65 24 57 18 62 5Z',
    layers: [
      {
        d: 'M62 42C59 61 88 64 85 86C83 104 58 112 41 99C23 84 41 62 45 54C44 72 59 69 62 42Z',
        fill: 'accent',
      },
      { d: 'M59 75C62 86 77 91 66 103C53 109 43 99 47 92Z', fill: 'detail' },
      { d: 'M31 59C27 65 25 70 25 77M82 37 88 45', fill: 'none' },
    ],
  },
  lifting: {
    shape: 'M33 9H87L111 33V87L87 111H33L9 87V33Z',
    layers: [
      { d: 'M9 73 60 43 111 73V87L87 111H33L9 87Z', fill: 'detail' },
      { d: 'M34 55H86V66H34Z', fill: 'metal' },
      { d: 'M17 50H25V72H17ZM95 50H103V72H95Z', fill: 'highlight' },
      { d: 'M25 44H33V78H25ZM87 44H95V78H87Z', fill: 'detail' },
      { d: 'M33 36H43V85H33ZM77 36H87V85H77Z', fill: 'accent' },
      { d: 'M44 25 60 17 76 25M38 41V78M82 41V78', fill: 'none' },
    ],
  },
  water: {
    shape: 'M60 5C49 25 18 51 18 77A42 42 0 0 0 102 77C102 51 71 25 60 5Z',
    layers: [
      {
        d: 'M19 71C36 57 58 83 79 66C86 60 93 59 99 62L102 77C102 100 83 119 60 119S18 100 18 77Z',
        fill: 'accent',
      },
      {
        d: 'M22 91C48 76 72 106 99 92C93 108 78 119 60 119S29 110 22 91Z',
        fill: 'detail',
      },
      { d: 'M55 29C49 37 41 45 37 55', fill: 'none' },
      { d: 'M77 42a5 5 0 1 1 0 10a5 5 0 1 1 0-10Z', fill: 'highlight' },
      { d: 'M81 79a3 3 0 1 1 0 6a3 3 0 1 1 0-6Z', fill: 'highlight' },
    ],
  },
  streak: {
    shape: 'M30 8H90L114 42V78L90 112H30L6 78V42Z',
    layers: [
      { d: 'M6 72 54 50 114 74V78L90 112H30L6 78Z', fill: 'detail' },
      { d: 'M63 20 34 62H55L47 89 88 47H66L78 20Z', fill: 'accent' },
      { d: 'M24 32V42M19 37H29M94 65V75M89 70H99', fill: 'none' },
    ],
  },
  trophy: {
    shape:
      'M60 5 73 18 93 15 97 35 113 47 104 65 109 85 89 92 78 110 60 104 42 110 31 92 11 85 16 65 7 47 23 35 27 15 47 18Z',
    layers: [
      {
        d: 'M37 36H25V46C25 58 34 64 45 63M83 36H95V46C95 58 86 64 75 63',
        fill: 'none',
      },
      { d: 'M56 64H64V80H77V87H43V80H56Z', fill: 'metal' },
      { d: 'M37 30H83V45C83 62 73 70 60 70S37 62 37 45Z', fill: 'accent' },
      { d: 'm60 38 4 8 9 1-7 6 2 9-8-4-8 4 2-9-7-6 9-1Z', fill: 'detail' },
    ],
  },
}

export function AchievementMedal({
  art,
  mark,
  earned,
}: {
  art: BadgeArtwork
  mark?: string
  earned: boolean
}) {
  const theme = useTheme()
  const id = useId()
  const rimId = `medal-rim-${id}`
  const faceId = `medal-face-${id}`
  const glossId = `medal-gloss-${id}`
  const clipId = `medal-shape-${id}`
  const artwork = ARTWORKS[art]
  const palette = AchievementMedalColors.enamel[art]
  const outline = earned ? `url(#${rimId})` : theme.disabled
  const fills: Record<EnamelFill, string> = {
    accent: palette.accent,
    detail: palette.detail,
    metal: `url(#${rimId})`,
    highlight: AchievementMedalColors.highlight,
    none: 'none',
  }

  return (
    <View
      testID="achievement-medal-art"
      style={styles.frame}
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 120 124"
        style={StyleSheet.absoluteFill}
        focusable={false}
      >
        <Defs>
          <ClipPath id={clipId}>
            <Path d={artwork.shape} />
          </ClipPath>
          <LinearGradient id={rimId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor={AchievementMedalColors.highlight} />
            <Stop offset="0.35" stopColor={AchievementMedalColors.gold} />
            <Stop offset="0.55" stopColor={AchievementMedalColors.highlight} />
            <Stop offset="1" stopColor={AchievementMedalColors.shadow} />
          </LinearGradient>
          <LinearGradient id={faceId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0" stopColor={palette.top} />
            <Stop offset="1" stopColor={palette.bottom} />
          </LinearGradient>
          <LinearGradient id={glossId} x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop
              offset="0"
              stopColor={AchievementMedalColors.highlight}
              stopOpacity={0.3}
            />
            <Stop
              offset="0.5"
              stopColor={AchievementMedalColors.highlight}
              stopOpacity={0}
            />
            <Stop
              offset="1"
              stopColor={AchievementMedalColors.highlight}
              stopOpacity={0.08}
            />
          </LinearGradient>
        </Defs>
        {earned && (
          <Path
            d={artwork.shape}
            fill={theme.shadow}
            stroke={theme.shadow}
            strokeWidth={4}
            opacity={0.3}
            transform="translate(0 2)"
          />
        )}
        <G
          stroke={outline}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
          opacity={earned ? 1 : 0.55}
        >
          <Path
            d={artwork.shape}
            fill={earned ? `url(#${faceId})` : theme.background}
            strokeWidth={4}
          />
          <G clipPath={`url(#${clipId})`}>
            {artwork.layers.map(({ d, fill }, index) => (
              <Path
                key={index}
                d={d}
                fill={
                  fill === 'none'
                    ? 'none'
                    : earned
                      ? fills[fill]
                      : theme.background
                }
              />
            ))}
            {earned && (
              <Path d={artwork.shape} fill={`url(#${glossId})`} stroke="none" />
            )}
            {mark && (
              <>
                <Path
                  d="M39 91H81L87 99 81 107H39L33 99Z"
                  fill={earned ? palette.detail : theme.background}
                />
                <SvgText
                  x={60}
                  y={100}
                  alignmentBaseline="central"
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight="700"
                  fill={
                    earned ? AchievementMedalColors.highlight : theme.disabled
                  }
                  stroke="none"
                >
                  {mark}
                </SvgText>
              </>
            )}
          </G>
          <Path d={artwork.shape} fill="none" strokeWidth={4} />
        </G>
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: 108,
    aspectRatio: 120 / 124,
    pointerEvents: 'none',
  },
})
