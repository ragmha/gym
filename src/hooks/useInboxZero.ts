import { useEffect, useRef, useState } from 'react'
import { Linking } from 'react-native'

import {
  loadInboxPage,
  trashMessages,
  type InboxMessage,
} from '@/lib/inboxZero'
import { connectGmail, inboxZeroAvailability } from '@/lib/inboxZeroAuth'

export function useInboxZero() {
  const [unavailable] = useState(inboxZeroAvailability)
  const token = useRef<string | null>(null)
  const operation = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<InboxMessage[]>([])
  const [nextPage, setNextPage] = useState<string>()
  const [busy, setBusy] = useState<
    'connecting' | 'loading' | 'trashing' | 'opening' | null
  >(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [needsRefresh, setNeedsRefresh] = useState(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      operation.current?.abort()
      token.current = null
    }
  }, [])

  const run = async (
    kind: NonNullable<typeof busy>,
    action: (signal: AbortSignal) => Promise<void>,
  ) => {
    if (operation.current || unavailable) return
    const controller = new AbortController()
    operation.current = controller
    setBusy(kind)
    setError(null)
    setNotice(null)
    try {
      await action(controller.signal)
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted) {
        setError(
          cause instanceof Error && cause.name === 'Error'
            ? cause.message
            : 'The request could not be completed. Refresh before trying again.',
        )
      }
    } finally {
      if (operation.current === controller) operation.current = null
      if (mounted.current) setBusy(null)
    }
  }

  const load = (more = false) =>
    run('loading', async (signal) => {
      if (!token.current) throw new Error('Connect Gmail first.')
      const page = await loadInboxPage(
        token.current,
        signal,
        more ? nextPage : undefined,
      )
      if (signal.aborted) return
      setMessages((previous) => [
        ...new Map(
          [...(more ? previous : []), ...page.messages].map((m) => [m.id, m]),
        ).values(),
      ])
      setNextPage(page.nextPageToken)
      setNeedsRefresh(false)
    })

  const connect = () =>
    run('connecting', async (signal) => {
      const accessToken = await connectGmail()
      if (signal.aborted || !accessToken) return
      token.current = accessToken
      setConnected(true)
      const page = await loadInboxPage(accessToken, signal)
      if (signal.aborted) return
      setMessages(page.messages)
      setNextPage(page.nextPageToken)
    })

  const trash = (ids: string[]) =>
    run('trashing', async (signal) => {
      if (!token.current) throw new Error('Connect Gmail first.')
      if (needsRefresh)
        throw new Error(
          'Refresh after the previous cleanup attempt before trying again.',
        )
      if (ids.some((id) => !messages.some((message) => message.id === id))) {
        throw new Error('The selection changed. Review it again.')
      }
      setNeedsRefresh(true)
      try {
        await trashMessages(token.current, ids, signal)
      } catch {
        throw new Error(
          'Cleanup was not fully confirmed and may have partially succeeded. Refresh before another cleanup. Check Gmail Trash to restore messages.',
        )
      }
      if (signal.aborted) return
      setMessages((previous) => previous.filter((m) => !ids.includes(m.id)))
      // Deleting changes Gmail's page boundaries. Restart pagination on refresh.
      setNextPage(undefined)
      setNotice(
        `${ids.length} messages confirmed in Gmail Trash. Gmail normally deletes Trash after 30 days. Restore them in Gmail if needed. Refresh to load the remaining inbox.`,
      )
    })

  const openUnsubscribe = (url: string) =>
    run('opening', async (signal) => {
      if (!messages.some((m) => m.unsubscribe.includes(url)))
        throw new Error('This unsubscribe link is no longer available.')
      try {
        await Linking.openURL(url)
      } catch {
        throw new Error(
          'Could not open the unsubscribe page. Open the original message in Gmail instead.',
        )
      }
      if (!signal.aborted)
        setNotice(
          'Unsubscribe page opened. Complete it in your browser; opening it does not confirm an unsubscribe.',
        )
    })

  const disconnect = () => {
    if (operation.current) return
    token.current = null
    setConnected(false)
    setMessages([])
    setNextPage(undefined)
    setError(null)
    setNotice(
      'Disconnected on this screen. To revoke the Google grant, use your Google Account’s third-party connections.',
    )
    setNeedsRefresh(false)
  }

  return {
    unavailable,
    connected,
    messages,
    nextPage,
    busy,
    error,
    notice,
    needsRefresh,
    connect,
    load,
    trash,
    openUnsubscribe,
    disconnect,
  }
}
