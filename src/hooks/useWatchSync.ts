import { requireOptionalNativeModule } from 'expo'
import { useEffect } from 'react'
import { Platform } from 'react-native'

import { localDateKey } from '@/lib/healthSnapshot/dateKey'
import { applyWatchMessage, watchState } from '@/lib/watch'
import { useGymLogStore } from '@/stores/GymLogStore'

/** Native side: modules/gym-watch/ios/GymWatchModule.swift. */
export interface GymWatchBridge {
  setState(json: string): void
  takeMessages(): string[]
  addListener(event: 'onMessages', listener: () => void): { remove(): void }
}

/** Mirrors today's lifting day to the watch and applies the sets logged there. */
export function startWatchSync(watch: GymWatchBridge): () => void {
  const push = () => {
    const today = localDateKey(new Date())
    // sentAt keeps every push distinct so the watch always receives it.
    watch.setState(
      JSON.stringify({
        ...watchState(useGymLogStore.getState(), today),
        sentAt: Date.now(),
      }),
    )
  }
  const drain = () => {
    const today = localDateKey(new Date())
    for (const json of watch.takeMessages()) applyWatchMessage(json, today)
    // Always answer: replies to sync requests and reverts rejected taps.
    push()
  }

  let stop = () => {}
  const begin = () => {
    drain()
    const unsubscribe = useGymLogStore.subscribe(push)
    const listener = watch.addListener('onMessages', drain)
    stop = () => {
      unsubscribe()
      listener.remove()
    }
  }

  // Logging before the saved log loads could overwrite it.
  if (useGymLogStore.persist.hasHydrated()) {
    begin()
    return () => stop()
  }
  const unsubscribe = useGymLogStore.persist.onFinishHydration(begin)
  return () => {
    unsubscribe()
    stop()
  }
}

export function useWatchSync() {
  useEffect(() => {
    // Null on web, Android and binaries built without the watch app.
    const watch =
      Platform.OS === 'ios'
        ? requireOptionalNativeModule<GymWatchBridge>('GymWatch')
        : null
    return watch ? startWatchSync(watch) : undefined
  }, [])
}
