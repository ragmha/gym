import { fireEvent, render, screen } from '@testing-library/react-native'
import { useLocalSearchParams } from 'expo-router'

import WaterScreen from '@/app/water'
import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { waterWriter } from '@/lib/healthSnapshot/waterWriter'
import { supportsWaterNativeVersion } from '@/lib/healthSnapshot/water'
import type { DailyWaterReading } from '@/lib/healthSnapshot/types'

const mockGetWaterHistory = jest.fn<
  Promise<DailyWaterReading[]>,
  [Date, number]
>()
const mockWaterWriterSave = jest.fn<
  Promise<void>,
  [{ liters: number; measuredAt: Date }]
>()

jest.mock('@/lib/healthSnapshot/HealthSnapshotSource', () => ({
  healthSnapshot: {
    getWaterHistory: (endDate: Date, days: number) =>
      mockGetWaterHistory(endDate, days),
    isAvailable: () => true,
  },
}))

jest.mock('@/lib/healthSnapshot/waterWriter', () => ({
  waterWriter: {
    getAvailability: jest.fn(() => ({
      available: false,
      reason: 'build-required',
      message: 'A new iOS build is required.',
    })),
    save: (entry: { liters: number; measuredAt: Date }) =>
      mockWaterWriterSave(entry),
  },
}))

jest.mock('@react-navigation/native', () => ({
  usePreventRemove: jest.fn(),
}))

jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } = jest.requireActual('@/constants/Colors')
  return { useTheme: () => Colors.light }
})

const history: DailyWaterReading[] = [
  { date: '2026-10-13', liters: 2.4 },
  { date: '2026-10-14', liters: null },
  { date: '2026-10-15', liters: 0 },
  { date: '2026-10-16', liters: 1.5 },
]

describe('WaterScreen', () => {
  beforeEach(() => {
    mockGetWaterHistory.mockReset()
    mockWaterWriterSave.mockReset()
    jest.mocked(waterWriter.getAvailability).mockReturnValue({
      available: false,
      reason: 'build-required',
      message: 'A new iOS build is required.',
    })
    jest.mocked(useLocalSearchParams).mockReturnValue({ date: '2026-10-16' })
  })

  afterEach(() => jest.restoreAllMocks())

  it('reads the selected day and its history in one query', async () => {
    mockGetWaterHistory.mockResolvedValue(history)

    render(<WaterScreen />)

    expect(await screen.findByLabelText('1.5 liters of water')).toBeTruthy()
    expect(mockGetWaterHistory).toHaveBeenCalledTimes(1)
    const [endDate, days] = mockGetWaterHistory.mock.calls[0]
    expect(endDate.getFullYear()).toBe(2026)
    expect(endDate.getMonth()).toBe(9)
    expect(endDate.getDate()).toBe(16)
    expect(days).toBe(28)
    expect(
      screen.getByLabelText(
        'Water recorded on 3 of 4 days, highest 2.4 liters',
      ),
    ).toBeTruthy()
  })

  it('shows no water goal', async () => {
    mockGetWaterHistory.mockResolvedValue(history)

    render(<WaterScreen />)
    await screen.findByLabelText('1.5 liters of water')

    expect(screen.queryByText(/goal/i)).toBeNull()
  })

  it('adjusts an ephemeral amount in 250 mL steps and saves only on confirmation', async () => {
    jest.mocked(waterWriter.getAvailability).mockReturnValue({
      available: true,
    })
    jest.mocked(useLocalSearchParams).mockReturnValue({
      date: localDateKey(new Date()),
    })
    mockGetWaterHistory.mockResolvedValue(history)
    mockWaterWriterSave.mockResolvedValue()

    const { getByRole, getByText, queryByText } = render(<WaterScreen />)
    await screen.findByLabelText('1.5 liters of water')
    const plus = getByRole('button', {
      name: 'Increase water amount by 250 milliliters',
    })
    const minus = getByRole('button', {
      name: 'Decrease water amount by 250 milliliters',
    })
    const save = getByRole('button', { name: 'Save to Apple Health' })

    expect(minus).toBeDisabled()
    expect(save).toBeDisabled()
    fireEvent.press(plus)
    expect(getByText('+0.25 L unsaved')).toBeTruthy()
    // The Health reading is not changed by an unsaved draft.
    expect(screen.getByLabelText('1.5 liters of water')).toBeTruthy()
    fireEvent.press(minus)
    expect(queryByText(/unsaved/)).toBeNull()
    expect(mockWaterWriterSave).not.toHaveBeenCalled()

    fireEvent.press(plus)
    fireEvent.press(plus)
    fireEvent.press(save)

    expect(await screen.findByText('Saved to Apple Health.')).toBeTruthy()
    expect(mockWaterWriterSave).toHaveBeenCalledTimes(1)
    expect(mockWaterWriterSave.mock.calls[0][0].liters).toBe(0.5)
    expect(mockGetWaterHistory).toHaveBeenCalledTimes(2)
    expect(queryByText(/unsaved/)).toBeNull()
  })

  it('keeps the draft and shows the error when Health does not save', async () => {
    jest.mocked(waterWriter.getAvailability).mockReturnValue({
      available: true,
    })
    jest.mocked(useLocalSearchParams).mockReturnValue({
      date: localDateKey(new Date()),
    })
    mockGetWaterHistory.mockResolvedValue(history)
    mockWaterWriterSave.mockRejectedValue(new Error('native detail'))

    const { getByRole } = render(<WaterScreen />)
    await screen.findByLabelText('1.5 liters of water')
    fireEvent.press(
      getByRole('button', { name: 'Increase water amount by 250 milliliters' }),
    )
    fireEvent.press(getByRole('button', { name: 'Save to Apple Health' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /did not confirm the saved water sample/,
    )
    expect(screen.queryByText(/native detail/)).toBeNull()
    expect(screen.getByText('+0.25 L unsaved')).toBeTruthy()
    expect(mockGetWaterHistory).toHaveBeenCalledTimes(1)
  })

  it.each([
    [
      'saving is unavailable',
      localDateKey(new Date()),
      'A new iOS build is required.',
    ],
    [
      'the day is not today',
      '2026-10-16',
      'Water can only be added for today.',
    ],
  ])(
    'shows disabled +/- with the reason when %s',
    async (_case, date, reason) => {
      jest.mocked(useLocalSearchParams).mockReturnValue({ date })
      mockGetWaterHistory.mockResolvedValue(history)

      const { getByRole } = render(<WaterScreen />)
      await screen.findByLabelText('1.5 liters of water')

      for (const name of [
        'Increase water amount by 250 milliliters',
        'Decrease water amount by 250 milliliters',
      ]) {
        const button = getByRole('button', { name })
        expect(button).toBeDisabled()
        fireEvent.press(button)
      }
      expect(screen.getByText(reason)).toBeTruthy()
      expect(
        screen.queryByRole('button', { name: 'Save to Apple Health' }),
      ).toBeNull()
      expect(screen.queryByText(/unsaved/)).toBeNull()
      expect(mockWaterWriterSave).not.toHaveBeenCalled()
    },
  )

  it('keeps missing days distinct from observed zero', async () => {
    mockGetWaterHistory.mockResolvedValue(history)

    render(<WaterScreen />)
    await screen.findByLabelText('1.5 liters of water')

    expect(screen.getByTestId('water-day-2026-10-14-missing')).toBeTruthy()
    expect(screen.queryByTestId('water-day-2026-10-14')).toBeNull()
    expect(screen.getByTestId('water-day-2026-10-15')).toBeTruthy()
  })

  it('shows -- and an empty bottle when the selected day has no reading', async () => {
    mockGetWaterHistory.mockResolvedValue([
      { date: '2026-10-15', liters: 1 },
      { date: '2026-10-16', liters: null },
    ])

    render(<WaterScreen />)

    expect(await screen.findByLabelText('Water unavailable')).toBeTruthy()
    expect(screen.getByText('--')).toBeTruthy()
    expect(
      screen.queryByTestId('water-bottle-liquid', {
        includeHiddenElements: true,
      }),
    ).toBeNull()
  })

  it('shows an error that retries the read', async () => {
    mockGetWaterHistory
      .mockRejectedValueOnce(new Error('denied'))
      .mockResolvedValueOnce(history)

    render(<WaterScreen />)

    fireEvent.press(
      await screen.findByRole('button', {
        name: 'Retry loading health data',
      }),
    )

    expect(await screen.findByLabelText('1.5 liters of water')).toBeTruthy()
    expect(mockGetWaterHistory).toHaveBeenCalledTimes(2)
  })

  it('requires a compatible 1.0.9 native version for water entry', () => {
    expect(supportsWaterNativeVersion('1.0.8')).toBe(false)
    expect(supportsWaterNativeVersion('1.0.9')).toBe(true)
  })
})
