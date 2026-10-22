import { Redirect } from 'expo-router'

import DevAiEvalsPanel from '@/components/coach/DevAiEvalsPanel'

export default function DevAiEvalsRoute() {
  if (!__DEV__) return <Redirect href="/" />
  return <DevAiEvalsPanel />
}
