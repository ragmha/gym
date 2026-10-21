import { act, fireEvent, render, screen } from '@testing-library/react-native'

import { RepCameraCounter } from '@/components/gym/RepCameraCounter'

type OnAngle = (event: {
  nativeEvent: { joint: string; angle?: number }
}) => void
let mockOnAngle: OnAngle = () => {}
let mockOnError: (event: { nativeEvent: { code: string } }) => void = () => {}
let mockAppState: (state: string) => void = () => {}
let mockPermission = { granted: true, status: 'granted', canAskAgain: true }
const mockRequestPermission = jest.fn().mockResolvedValue(mockPermission)

jest.mock('react-native', () => {
  const native = jest.requireActual('react-native')
  Object.defineProperty(native.Platform, 'Version', { get: () => '18.0' })
  native.AppState.currentState = 'active'
  native.AppState.addEventListener = (
    _: string,
    handler: typeof mockAppState,
  ) => {
    mockAppState = handler
    return { remove: jest.fn() }
  }
  return native
})
jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  requireOptionalNativeModule: (name: string) =>
    name === 'RepCamera' ? {} : null,
  requireNativeView:
    () => (props: { onAngle: OnAngle; onError: typeof mockOnError }) => {
      mockOnAngle = props.onAngle
      mockOnError = props.onError
      return null
    },
}))
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
}))
jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }))
jest.mock('@/hooks/useThemeColor', () => {
  const { Colors } = jest.requireActual('@/constants/Colors')
  return { useTheme: () => Colors.light }
})

function angles(values: (number | undefined)[], joint = 'knee') {
  for (const angle of values)
    act(() => mockOnAngle({ nativeEvent: { joint, angle } }))
}

beforeEach(() => {
  mockPermission = { granted: true, status: 'granted', canAskAgain: true }
  mockRequestPermission.mockClear()
})

it('starts explicitly, stops before use, and hands back the total once', () => {
  const onCount = jest.fn()
  render(
    <RepCameraCounter
      title="Barbell Squat"
      onCount={onCount}
      onClose={jest.fn()}
    />,
  )
  expect(
    screen.getByRole('button', { name: 'Knees', selected: true }),
  ).toBeTruthy()
  angles([170, 90, 170])
  expect(screen.getByTestId('gym-rep-camera-count')).toHaveTextContent('0')
  fireEvent.press(screen.getByText('Start counting'))
  angles([170, 90, 170, 95, 165])
  expect(screen.getByTestId('gym-rep-camera-count')).toHaveTextContent('2')
  expect(screen.getByTestId('gym-rep-camera-use')).toBeDisabled()
  fireEvent.press(screen.getByText('Done counting'))
  angles([90, 170])
  fireEvent.press(screen.getByTestId('gym-rep-camera-use'))
  fireEvent.press(screen.getByTestId('gym-rep-camera-use'))
  expect(onCount).toHaveBeenCalledTimes(1)
  expect(onCount).toHaveBeenCalledWith(2)
})

it('ignores stale joints and does not bridge a tracking gap', () => {
  render(
    <RepCameraCounter title="Squat" onCount={jest.fn()} onClose={jest.fn()} />,
  )
  fireEvent.press(screen.getByText('Elbows'))
  angles([170], 'elbow')
  fireEvent.press(screen.getByText('Start counting'))
  angles([170, 90, 170]) // stale knees
  angles([170, 90, undefined, 170], 'elbow')
  expect(screen.getByTestId('gym-rep-camera-count')).toHaveTextContent('0')
  angles([90, 170], 'elbow')
  expect(screen.getByTestId('gym-rep-camera-count')).toHaveTextContent('1')
})

it('can start at arms reach before stepping back into view', () => {
  render(
    <RepCameraCounter title="Squat" onCount={jest.fn()} onClose={jest.fn()} />,
  )
  expect(screen.getByText('Start counting')).not.toBeDisabled()
  fireEvent.press(screen.getByText('Start counting'))
  angles([undefined, undefined, 90, 170])
  expect(screen.getByTestId('gym-rep-camera-count')).toHaveTextContent('0')
  angles([90, 170])
  expect(screen.getByTestId('gym-rep-camera-count')).toHaveTextContent('1')
})

it('surfaces native failure and retries without silently continuing', () => {
  render(
    <RepCameraCounter title="Squat" onCount={jest.fn()} onClose={jest.fn()} />,
  )
  angles([170])
  fireEvent.press(screen.getByText('Start counting'))
  angles([170, 90])
  act(() => mockOnError({ nativeEvent: { code: 'interrupted' } }))
  angles([170])
  expect(screen.getByText(/Camera counting was interrupted/)).toBeTruthy()
  expect(screen.getByTestId('gym-rep-camera-count')).toHaveTextContent('0')
  fireEvent.press(screen.getByText('Try again'))
  expect(screen.getByText('Start counting')).toBeTruthy()
})

it('stops on backgrounding and keeps the last confirmed count for review', () => {
  render(
    <RepCameraCounter title="Squat" onCount={jest.fn()} onClose={jest.fn()} />,
  )
  angles([170])
  fireEvent.press(screen.getByText('Start counting'))
  angles([170, 90, 170])
  act(() => mockAppState('background'))
  angles([90, 170])
  expect(screen.getByTestId('gym-rep-camera-count')).toHaveTextContent('1')
  expect(screen.getByText(/app became inactive/)).toBeTruthy()
})

it('offers Settings when permission is denied', () => {
  mockPermission = { granted: false, status: 'denied', canAskAgain: false }
  render(
    <RepCameraCounter title="Squat" onCount={jest.fn()} onClose={jest.fn()} />,
  )
  expect(screen.getByText(/Turn it on in Settings/)).toBeTruthy()
  expect(mockRequestPermission).not.toHaveBeenCalled()
  expect(screen.getByText('Start counting')).toBeDisabled()
})
