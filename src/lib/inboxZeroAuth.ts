import { requireOptionalNativeModule } from 'expo'

import { getHealthKitWriteNativeSupport } from '@/lib/healthSnapshot/healthKitWriteNativeSupport'

export function inboxZeroAvailability(): string | null {
  const support = getHealthKitWriteNativeSupport('1.0.21', 'Connect Gmail')
  if (!support.available) return support.message
  try {
    if (
      !requireOptionalNativeModule('ExpoWebBrowser') ||
      !requireOptionalNativeModule('ExpoCrypto')
    )
      return 'Install a new iOS build (1.0.21 or later) to connect Gmail.'
  } catch {
    return 'Install a new iOS build (1.0.21 or later) to connect Gmail.'
  }
  return null
}

export async function connectGmail(): Promise<string | null> {
  const unavailable = inboxZeroAvailability()
  if (unavailable) throw new Error(unavailable)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const auth: typeof import('expo-auth-session') = require('expo-auth-session')
  const clientId =
    '326998065942-gri0bsvipmjvpnqnn6rsanpq6s69gtpd.apps.googleusercontent.com'
  const redirectUri =
    'com.googleusercontent.apps.326998065942-gri0bsvipmjvpnqnn6rsanpq6s69gtpd:/oauthredirect'
  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  }
  const request = new auth.AuthRequest({
    clientId,
    redirectUri,
    scopes: ['https://www.googleapis.com/auth/gmail.modify'],
    responseType: auth.ResponseType.Code,
    usePKCE: true,
    extraParams: { access_type: 'online', prompt: 'consent select_account' },
  })
  let result: Awaited<ReturnType<typeof request.promptAsync>>
  try {
    result = await request.promptAsync(discovery)
  } catch {
    throw new Error('Google sign-in could not open. Please try again.')
  }
  if (result.type === 'cancel' || result.type === 'dismiss') return null
  if (
    result.type !== 'success' ||
    !result.params.code ||
    !request.codeVerifier
  ) {
    throw new Error(
      'Google sign-in was not completed. Gmail was not connected.',
    )
  }
  try {
    const token = await auth.exchangeCodeAsync(
      {
        clientId,
        redirectUri,
        code: result.params.code,
        extraParams: { code_verifier: request.codeVerifier },
      },
      discovery,
    )
    if (
      !token.accessToken ||
      !token.scope
        ?.split(' ')
        .includes('https://www.googleapis.com/auth/gmail.modify')
    ) {
      throw new Error('Missing Gmail access')
    }
    return token.accessToken
  } catch {
    throw new Error(
      'Google did not grant Gmail cleanup access. Connect again and review the requested permission.',
    )
  }
}
