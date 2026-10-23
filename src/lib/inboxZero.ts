import { z } from 'zod'

const messageId = z.string().regex(/^[a-f0-9]+$/i)
const messageSchema = z.object({
  id: messageId,
  labelIds: z.array(z.string()).default([]),
  payload: z.object({
    headers: z.array(z.object({ name: z.string(), value: z.string() })),
  }),
})
const pageSchema = z.object({
  messages: z.array(z.object({ id: messageId })).optional(),
  nextPageToken: z.string().min(1).optional(),
})

export type InboxMessage = {
  id: string
  sender: string
  subject: string
  unsubscribe: string[]
}

export function unsubscribeLinks(header: string): string[] {
  return [
    ...new Set(Array.from(header.matchAll(/<([^<>]+)>/g), ([, raw]) => raw)),
  ].filter((raw) => {
    try {
      const url = new URL(raw)
      return (
        url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !url.port &&
        /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) &&
        !/\.(local|localhost|internal)$/i.test(url.hostname)
      )
    } catch {
      return false
    }
  })
}

export function groupSenders(messages: InboxMessage[]) {
  const groups = new Map<string, InboxMessage[]>()
  for (const message of messages) {
    const group = groups.get(message.sender) ?? []
    group.push(message)
    groups.set(message.sender, group)
  }
  return [...groups.entries()]
    .map(([sender, items]) => ({ sender, messages: items }))
    .sort(
      (a, b) =>
        b.messages.length - a.messages.length ||
        a.sender.localeCompare(b.sender),
    )
}

async function gmail(
  token: string,
  path: string,
  signal: AbortSignal,
  body?: object,
): Promise<unknown> {
  if (signal.aborted) throw new Error('Request cancelled.')
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 20_000)
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/${path}`,
      {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      },
    )
    if (!response.ok) {
      if (response.status === 401)
        throw new Error('Google access expired. Disconnect and connect again.')
      if (response.status === 403)
        throw new Error(
          'Gmail access was refused. Check Gmail API access and Google consent, then reconnect.',
        )
      if (response.status === 429)
        throw new Error('Gmail is busy. Wait a moment before retrying.')
      throw new Error(
        'Gmail could not complete the request. Refresh before trying again.',
      )
    }
    return await response.json()
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', abort)
  }
}

export async function loadInboxPage(
  token: string,
  signal: AbortSignal,
  pageToken?: string,
) {
  const query = new URLSearchParams({ labelIds: 'INBOX', maxResults: '100' })
  if (pageToken) query.set('pageToken', pageToken)
  const page = pageSchema.parse(await gmail(token, `messages?${query}`, signal))
  const messages: InboxMessage[] = []
  // ponytail: five concurrent metadata reads; no bodies, attachments or remote images.
  const ids = page.messages ?? []
  for (let index = 0; index < ids.length; index += 5) {
    const batch = await Promise.all(
      ids.slice(index, index + 5).map(async ({ id }) => {
        const query = new URLSearchParams({ format: 'metadata' })
        for (const header of ['From', 'Subject', 'List-Unsubscribe'])
          query.append('metadataHeaders', header)
        const message = messageSchema.parse(
          await gmail(token, `messages/${id}?${query}`, signal),
        )
        if (message.id !== id)
          throw new Error(
            'Gmail returned an unexpected message. Refresh the inbox.',
          )
        if (
          !message.labelIds.includes('INBOX') ||
          message.labelIds.includes('TRASH')
        )
          return null
        const header = (name: string) =>
          message.payload.headers.find((h) => h.name.toLowerCase() === name)
            ?.value ?? ''
        const from = header('from').trim()
        const address = /^(?:[^<>]*<([^<>]+)>|([^<>\s]+))$/.exec(from)
        const parsed = z.email().safeParse(address?.[1] ?? address?.[2])
        return {
          id,
          sender: parsed.success
            ? parsed.data.toLowerCase()
            : `Unrecognized sender (${id})`,
          subject: header('subject') || '(No subject)',
          unsubscribe: unsubscribeLinks(header('list-unsubscribe')),
        }
      }),
    )
    for (const message of batch) if (message) messages.push(message)
  }
  return { messages, nextPageToken: page.nextPageToken }
}

export async function trashMessages(
  token: string,
  ids: string[],
  signal: AbortSignal,
) {
  const validated = z.array(messageId).min(1).max(1000).parse(ids)
  const unique = [...new Set(validated)]
  await gmail(token, 'messages/batchModify', signal, {
    ids: unique,
    addLabelIds: ['TRASH'],
    removeLabelIds: ['INBOX'],
  })
  // A successful batch response has no per-message result. Verify before claiming success.
  for (let index = 0; index < unique.length; index += 5) {
    await Promise.all(
      unique.slice(index, index + 5).map(async (id) => {
        const result = z
          .object({ id: messageId, labelIds: z.array(z.string()) })
          .parse(await gmail(token, `messages/${id}?format=minimal`, signal))
        if (result.id !== id || !result.labelIds.includes('TRASH')) {
          throw new Error(
            'Not every message was confirmed in Trash. Refresh before trying again.',
          )
        }
      }),
    )
  }
}
