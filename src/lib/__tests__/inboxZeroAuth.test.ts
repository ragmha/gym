import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

import { connectGmail, inboxZeroAvailability } from '@/lib/inboxZeroAuth'

jest.mock('expo', () => ({ requireOptionalNativeModule: jest.fn() }))
jest.mock('expo-application', () => ({ nativeApplicationVersion: '1.0.21' }))
jest.mock('expo-auth-session', () => ({
  AuthRequest: jest.fn(),
  ResponseType: { Code: 'code' },
  exchangeCodeAsync: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const application = require('expo-application') as {
  nativeApplicationVersion: string | null
}
const originalOS = Platform.OS

beforeEach(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' })
  application.nativeApplicationVersion = '1.0.21'
  jest.mocked(requireOptionalNativeModule).mockReturnValue({})
})
afterAll(() => {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: originalOS,
  })
})

it.each(['web', 'android'])(
  'blocks %s before importing auth or checking native modules',
  async (platform) => {
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: platform,
    })
    jest.mocked(requireOptionalNativeModule).mockClear()
    await expect(connectGmail()).rejects.toThrow('iOS')
    expect(requireOptionalNativeModule).not.toHaveBeenCalled()
  },
)

it.each([null, '1.0.20', 'bad', '1.0.21.0'])(
  'fails closed for missing/old/malformed native version %s',
  async (version) => {
    application.nativeApplicationVersion = version
    await expect(connectGmail()).rejects.toThrow('1.0.21')
  },
)

it.each(['ExpoApplication', 'ExpoWebBrowser', 'ExpoCrypto'])(
  'fails closed without %s',
  async (missing) => {
    jest
      .mocked(requireOptionalNativeModule)
      .mockImplementation((name) => (name === missing ? null : {}))
    await expect(connectGmail()).rejects.toThrow('1.0.21')
  },
)

it('allows the compatible binary and uses PKCE with only the cleanup scope', async () => {
  expect(inboxZeroAvailability()).toBeNull()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const auth: typeof import('expo-auth-session') = require('expo-auth-session')
  const promptAsync = jest
    .fn()
    .mockResolvedValue({ type: 'success', params: { code: 'synthetic-code' } })
  jest.mocked(auth.AuthRequest).mockImplementation(
    () =>
      ({
        promptAsync,
        codeVerifier: 'synthetic-verifier',
      }) as unknown as InstanceType<typeof auth.AuthRequest>,
  )
  jest.mocked(auth.exchangeCodeAsync).mockResolvedValue({
    accessToken: 'synthetic-token',
    scope: 'https://www.googleapis.com/auth/gmail.modify',
  } as Awaited<ReturnType<typeof auth.exchangeCodeAsync>>)
  await expect(connectGmail()).resolves.toBe('synthetic-token')
  expect(auth.AuthRequest).toHaveBeenLastCalledWith(
    expect.objectContaining({
      usePKCE: true,
      scopes: ['https://www.googleapis.com/auth/gmail.modify'],
      extraParams: { access_type: 'online', prompt: 'consent select_account' },
    }),
  )
  expect(auth.exchangeCodeAsync).toHaveBeenLastCalledWith(
    expect.objectContaining({
      code: 'synthetic-code',
      extraParams: { code_verifier: 'synthetic-verifier' },
    }),
    expect.anything(),
  )
})
