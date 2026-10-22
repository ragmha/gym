import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import {
  plannerNative,
  readPlannerDay,
  setPlannerReminderCompleted,
} from '@/lib/plannerNative'

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }))
const originalOS = Platform.OS
const originalVersion = Object.getOwnPropertyDescriptor(Platform, 'Version')
const readDay = jest.fn()
const setReminderCompleted = jest.fn()

beforeEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
  Object.defineProperty(Platform, 'Version', {
    configurable: true,
    value: '17.0',
  })
  jest
    .mocked(requireOptionalNativeModule)
    .mockReset()
    .mockReturnValue({ readDay, setReminderCompleted })
  readDay.mockReset()
  setReminderCompleted.mockReset()
})
afterAll(() => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: originalOS,
  })
  if (originalVersion)
    Object.defineProperty(Platform, 'Version', originalVersion)
})

it('fails closed on unsupported platforms and old binaries before using native APIs', () => {
  for (const os of ['web', 'android'] as const) {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: os })
    expect(plannerNative()).toBeNull()
  }
  expect(requireOptionalNativeModule).not.toHaveBeenCalled()
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
  Object.defineProperty(Platform, 'Version', {
    configurable: true,
    value: '16.6',
  })
  expect(plannerNative()).toBeNull()
  expect(requireOptionalNativeModule).not.toHaveBeenCalled()
  Object.defineProperty(Platform, 'Version', {
    configurable: true,
    value: '17.0',
  })
  jest.mocked(requireOptionalNativeModule).mockReturnValue(null)
  expect(plannerNative()).toBeNull()
  expect(readDay).not.toHaveBeenCalled()
  jest.mocked(requireOptionalNativeModule).mockReturnValue({ readDay })
  expect(plannerNative()).toBeNull()
  jest
    .mocked(requireOptionalNativeModule)
    .mockReturnValue({ setReminderCompleted })
  expect(plannerNative()).toBeNull()
})

it('accepts only native-confirmed matching receipts and preserves exact reminder identity', async () => {
  const id = '  calendar-item:1  '
  setReminderCompleted.mockResolvedValue({ id, completed: true })
  await expect(setPlannerReminderCompleted(id, true)).resolves.toEqual({
    id,
    completed: true,
  })
  expect(setReminderCompleted).toHaveBeenCalledWith(id, true)
  const maxId = '😀'.repeat(512)
  setReminderCompleted.mockResolvedValue({ id: maxId, completed: false })
  await expect(setPlannerReminderCompleted(maxId, false)).resolves.toEqual({
    id: maxId,
    completed: false,
  })
  for (const receipt of [
    undefined,
    null,
    {},
    { id: 'other', completed: true },
    { id, completed: false },
  ]) {
    setReminderCompleted.mockResolvedValue(receipt)
    await expect(setPlannerReminderCompleted(id, true)).rejects.toThrow(
      'Apple Reminders did not confirm the change.',
    )
  }
})

it('rejects malformed input before calling any native API', async () => {
  for (const id of [
    '',
    '   ',
    'x'.repeat(1025),
    'task\n',
    'task\u0000',
    'task\u007f',
    'task\u0085',
    'task\u200b',
    '😀'.repeat(513),
  ]) {
    await expect(setPlannerReminderCompleted(id, true)).rejects.toThrow(
      'Invalid reminder change.',
    )
  }
  await expect(
    setPlannerReminderCompleted('task', 'true' as unknown as boolean),
  ).rejects.toThrow('Invalid reminder change.')
  expect(requireOptionalNativeModule).not.toHaveBeenCalled()
  expect(setReminderCompleted).not.toHaveBeenCalled()
})

it('never writes on unsupported platforms, unknown iOS versions or old modules', async () => {
  for (const os of ['web', 'android'] as const) {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: os })
    await expect(setPlannerReminderCompleted('task', true)).rejects.toThrow(
      'new iOS 17+ build',
    )
  }
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
  for (const version of ['16.6', 'unknown']) {
    Object.defineProperty(Platform, 'Version', {
      configurable: true,
      value: version,
    })
    await expect(setPlannerReminderCompleted('task', true)).rejects.toThrow(
      'new iOS 17+ build',
    )
  }
  expect(requireOptionalNativeModule).not.toHaveBeenCalled()
  Object.defineProperty(Platform, 'Version', {
    configurable: true,
    value: '17.0',
  })
  jest.mocked(requireOptionalNativeModule).mockReturnValue({ readDay })
  await expect(setPlannerReminderCompleted('task', true)).rejects.toThrow(
    'new iOS 17+ build',
  )
  expect(setReminderCompleted).not.toHaveBeenCalled()
})

it('reads one local day and validates returned events and reminders', async () => {
  readDay.mockResolvedValue({
    calendarAccess: 'granted',
    remindersAccess: 'undetermined',
    events: [],
    reminders: [],
  })
  const date = new Date(2026, 9, 21, 13)
  await expect(readPlannerDay(date)).resolves.toMatchObject({
    calendarAccess: 'granted',
  })
  expect(readDay).toHaveBeenCalledWith(
    new Date(2026, 9, 21).getTime(),
    new Date(2026, 9, 22).getTime(),
  )
  readDay.mockResolvedValue({ events: 'unexpected' })
  await expect(readPlannerDay(date)).rejects.toThrow(
    'Unable to read Calendar and Reminders.',
  )
})
