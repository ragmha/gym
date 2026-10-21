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
    expect(contrast(theme.text, theme.goalFill)).toBeGreaterThanOrEqual(3)
    expect(
      contrast(theme.goalOnComplete, theme.goalComplete),
    ).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the weight goal text readable and the trend bars visible', () => {
    for (const surface of ['homeBackground', 'cardBackground'] as const) {
      expect(
        contrast(theme.weightGoalText, theme[surface]),
      ).toBeGreaterThanOrEqual(4.5)
    }
    for (const bar of ['weightBarStart', 'weightBarEnd'] as const) {
      expect(contrast(theme[bar], theme.homeBackground)).toBeGreaterThanOrEqual(
        3,
      )
    }
  })
})

describe('Shared visual tokens', () => {
  it('uses system typography with a lighter numeric hierarchy', () => {
    for (const style of Object.values(Typography)) {
      expect(style).not.toHaveProperty('fontFamily')
    }
    expect(Typography.displayLg.fontWeight).toBe('300')
    expect(Typography.headingXl.fontWeight).toBe('700')
    expect(Typography.bodyMd.fontSize).toBeGreaterThanOrEqual(17)
  })

  it('uses offset box shadows and touch targets of at least 44 points', () => {
    expect(Elevation.soft.boxShadow).toContain('0 6px')
    expect(Elevation.soft).not.toHaveProperty('shadowOpacity')
    expect(Layout.controlSize).toBeGreaterThanOrEqual(44)
  })
})
