import { render } from '@testing-library/react-native'
import { withTiming } from 'react-native-reanimated'

import { buildFitnessRings } from '@/components/dashboard/fitnessRings'
import { FitnessRingsCard } from '@/components/dashboard/WorkoutXPCard'

jest.mock('@/hooks/useThemeColor', () => ({
  useTheme: () => ({
    cardBackground: '#FFFFFF',
    text: '#111111',
    icon: '#666666',
  }),
}))

describe('FitnessRingsCard missing data', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('draws empty rings but displays and announces unavailable measurements', () => {
    const { getByText, getByRole, queryByText } = render(
      <FitnessRingsCard
        metrics={buildFitnessRings(null)}
        onPress={jest.fn()}
      />,
    )

    expect(getByText('-- / 600 kcal')).toBeTruthy()
    expect(getByText('-- / 2.5 L')).toBeTruthy()
    expect(getByText('-- / 8 hrs')).toBeTruthy()
    expect(getByText('-- / 10.0k steps')).toBeTruthy()
    expect(getByText('-- / 45 min')).toBeTruthy()
    expect(queryByText(/^0 /)).toBeNull()
    expect(
      getByRole('button', {
        name: 'Calories unavailable. Hydration unavailable. Sleep unavailable. Steps unavailable. Workouts unavailable',
      }),
    ).toBeTruthy()
    expect(withTiming).toHaveBeenCalledWith(0, expect.any(Object))
  })

  it('displays and announces real zeros rather than placeholders', () => {
    const metrics = buildFitnessRings(null).map((metric) => ({
      ...metric,
      value: 0,
    }))
    const { getByText, getByRole, queryByText } = render(
      <FitnessRingsCard metrics={metrics} onPress={jest.fn()} />,
    )

    expect(getByText('0 kcal / 600 kcal')).toBeTruthy()
    expect(getByText('0 L / 2.5 L')).toBeTruthy()
    expect(getByText('0 hrs / 8 hrs')).toBeTruthy()
    expect(getByText('0 steps / 10.0k steps')).toBeTruthy()
    expect(getByText('0 min / 45 min')).toBeTruthy()
    expect(queryByText(/--/)).toBeNull()
    expect(
      getByRole('button', {
        name: 'Calories 0 kcal. Hydration 0 L. Sleep 0 hrs. Steps 0 steps. Workouts 0 min',
      }),
    ).toBeTruthy()
  })

  it('keeps available values alongside missing ones', () => {
    const metrics = buildFitnessRings(null).map((metric) => ({
      ...metric,
      value: metric.label === 'Steps' ? 8_000 : metric.value,
    }))
    const { getByText, getByRole } = render(
      <FitnessRingsCard metrics={metrics} onPress={jest.fn()} />,
    )

    expect(getByText('-- / 600 kcal')).toBeTruthy()
    expect(getByText('8,000 steps / 10.0k steps')).toBeTruthy()
    expect(
      getByRole('button', { name: /Sleep unavailable. Steps 8,000 steps/ }),
    ).toBeTruthy()
  })
})
