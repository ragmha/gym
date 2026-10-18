import { Stack } from 'expo-router'
import { act, renderRouter, testRouter } from 'expo-router/testing-library'
import { Text } from 'react-native'

import { unstable_settings as rootSettings } from '../_layout'
import GymLayout, { unstable_settings as gymSettings } from '../gym/_layout'

jest.unmock('expo-router')

it('keeps Back working when a gym screen is opened directly', () => {
  const router = renderRouter(
    {
      _layout: { default: () => <Stack />, unstable_settings: rootSettings },
      index: () => <Text>Home</Text>,
      'gym/_layout': { default: GymLayout, unstable_settings: gymSettings },
      'gym/index': () => <Text>Gym</Text>,
      'gym/food': () => <Text>Food</Text>,
    },
    { initialUrl: '/gym/food' },
  )

  expect(router.getPathname()).toBe('/gym/food')
  act(() => testRouter.back())
  expect(router.getPathname()).toBe('/gym')
  act(() => testRouter.back())
  expect(router.getPathname()).toBe('/')
})
