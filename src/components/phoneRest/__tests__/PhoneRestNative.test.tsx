import { render } from '@testing-library/react-native'
import { requireNativeView, requireOptionalNativeModule } from 'expo'
import type { ViewProps } from 'react-native'

import PhoneRestPanel from '@/components/phoneRest/PhoneRestPanel.ios'
import type { PhoneRestPanelProps } from '@/components/phoneRest/PhoneRestPanel.types'

jest.mock('expo', () => {
  const React = jest.requireActual<typeof import('react')>('react')
  const { View } =
    jest.requireActual<typeof import('react-native')>('react-native')
  return {
    requireOptionalNativeModule: jest.fn(() => ({})),
    requireNativeView: jest.fn(
      () =>
        function MockNativePanel(props: PhoneRestPanelProps & ViewProps) {
          return React.createElement(View, {
            ...props,
            testID: 'private-native-report',
          })
        },
    ),
  }
})

it('hosts the native report with input-only props and no data event channel', () => {
  const { getByTestId } = render(
    <PhoneRestPanel dateKey="2026-09-13" colorScheme="dark" />,
  )
  const report = getByTestId('private-native-report')

  expect(requireOptionalNativeModule).toHaveBeenCalledWith('PhoneRest')
  expect(requireNativeView).toHaveBeenCalledWith('PhoneRest')
  expect(report.props.dateKey).toBe('2026-09-13')
  expect(report.props.colorScheme).toBe('dark')
  expect(report.props.onData).toBeUndefined()
  expect(report.props.onEstimate).toBeUndefined()
})
