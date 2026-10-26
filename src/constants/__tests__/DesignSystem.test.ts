import { Colors } from '@/constants/Colors'
import { Elevation, Layout, Typography } from '@/constants/DesignSystem'

function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  )
  return (values[0] + 0.05) / (values[1] + 0.05)
}

describe.each(['light', 'dark'] as const)('%s visual system', (mode) => {
  const theme = Colors[mode]
  it('uses the Nothing monochrome canvas and neutral metric palette', () => {
    expect(theme.background).toBe(mode === 'light' ? '#F5F5F5' : '#000000')
    expect(theme.homeBackground).toBe(theme.background)
    expect(theme.metricSteps).toBe(theme.text)
    expect(theme.metricHydration).toBe(theme.text)
  })

  it.each([
    'background',
    'homeBackground',
    'cardBackground',
    'cardSurface',
    'accentInactive',
  ] as const)('keeps small text readable on %s', (surface) => {
    for (const text of [
      'text',
      'subtitleText',
      'accent',
      'success',
      'warning',
      'danger',
      'disabled',
    ] as const) {
      expect(contrast(theme[text], theme[surface])).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('uses a contrasting foreground on primary buttons and selected dates', () => {
    expect(contrast(theme.selectedText, theme.accent)).toBeGreaterThanOrEqual(
      4.5,
    )
  })

  it('keeps the measured step-progress stroke distinct from its track', () => {
    expect(contrast(theme.progress, theme.separator)).toBeGreaterThanOrEqual(3)
  })

  it('keeps goal captions and icons readable on partial and completed tiles', () => {
    expect(
      contrast(theme.goalProgressText, theme.homeBackground),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(theme.goalOnComplete, theme.goalFill),
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrast(theme.goalOnComplete, theme.goalComplete),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('uses red as the only chromatic accent with no screen palettes', () => {
    for (const color of Object.values(theme)) {
      if (color.startsWith('#') && !/^#([0-9A-F]{2})\1\1$/i.test(color)) {
        expect(color).toBe(theme.accent)
      }
    }
    expect(theme.warning).toBe(theme.accent)
    expect(theme.danger).toBe(theme.accent)
    expect(theme.goalComplete).toBe(theme.accent)
    expect(theme).not.toHaveProperty('weightBarStart')
    expect(theme).not.toHaveProperty('weightBarEnd')
    expect(theme).not.toHaveProperty('weightGoalText')
  })
})

describe('Shared visual tokens', () => {
  it('shares the same red identity across every screen in both appearances', () => {
    expect(Colors.light.accent).toBe('#C8102E')
    expect(Colors.dark.accent).toBe('#FF4D55')
    expect(Colors.light.metricWeight).toBe(Colors.light.text)
    expect(Colors.dark.metricWeight).toBe(Colors.dark.text)
  })

  it('keeps system typography with Space Mono instrument labels and tabular values', () => {
    expect(Typography.bodyMd).not.toHaveProperty('fontFamily')
    expect(Typography.headingLg).not.toHaveProperty('fontFamily')
    expect(Typography.labelMd.fontFamily).toBe('SpaceMono')
    expect(Typography.labelMd.textTransform).toBe('uppercase')
    expect(Typography.numericMd.fontVariant).toContain('tabular-nums')
    expect(Typography.displayLg.fontWeight).toBe('300')
    expect(Typography.displayXl.fontWeight).toBe('300')
    expect(Typography.headingXl.fontWeight).toBe('700')
    expect(Typography.bodyMd.fontSize).toBeGreaterThanOrEqual(17)
  })

  it('uses flat surfaces and accessible touch targets', () => {
    expect(Elevation.soft.boxShadow).toBe('none')
    expect(Elevation.floating.boxShadow).toBe('none')
    expect(Elevation.soft).not.toHaveProperty('shadowOpacity')
    expect(Layout.controlSize).toBeGreaterThanOrEqual(44)
    expect(Layout.controlSize).toBe(48)
  })
})
