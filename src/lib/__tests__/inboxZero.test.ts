import {
  groupSenders,
  loadInboxPage,
  trashMessages,
  unsubscribeLinks,
} from '@/lib/inboxZero'

const fetchMock = jest.fn()
const originalFetch = global.fetch
const response = (body: unknown, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
})
const metadata = (id: string, labels = ['INBOX']) => ({
  id,
  labelIds: labels,
  payload: {
    headers: [
      { name: 'From', value: 'Example <newsletter@example.com>' },
      { name: 'Subject', value: 'A synthetic newsletter' },
      {
        name: 'List-Unsubscribe',
        value: '<https://example.com/unsubscribe?id=synthetic>',
      },
    ],
  },
})

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock
})
afterAll(() => {
  global.fetch = originalFetch
})

it('reads only paged inbox metadata, checks labels, normalizes and groups senders', async () => {
  fetchMock
    .mockResolvedValueOnce(
      response({
        messages: [{ id: 'a1' }, { id: 'b2' }],
        nextPageToken: 'page+2',
      }),
    )
    .mockResolvedValueOnce(response(metadata('a1')))
    .mockResolvedValueOnce(response(metadata('b2', ['TRASH'])))
  const page = await loadInboxPage(
    'synthetic-token',
    new AbortController().signal,
  )
  expect(page.nextPageToken).toBe('page+2')
  expect(page.messages).toHaveLength(1)
  expect(page.messages[0].sender).toBe('newsletter@example.com')
  expect(fetchMock.mock.calls[0][0]).toContain('labelIds=INBOX&maxResults=100')
  expect(fetchMock.mock.calls[1][0]).toContain('format=metadata')
  expect(fetchMock.mock.calls[1][0]).toContain(
    'metadataHeaders=List-Unsubscribe',
  )
  expect(
    groupSenders([...page.messages, { ...page.messages[0], id: 'c3' }])[0]
      .messages,
  ).toHaveLength(2)
})

it('returns a real empty inbox and encodes the next-page token', async () => {
  fetchMock.mockResolvedValue(response({}))
  await expect(
    loadInboxPage('synthetic', new AbortController().signal, 'next+/'),
  ).resolves.toEqual({ messages: [], nextPageToken: undefined })
  expect(fetchMock.mock.calls[0][0]).toContain('pageToken=next%2B%2F')
})

it('never fetches unsubscribe destinations and rejects unsupported or unsafe links', () => {
  expect(
    unsubscribeLinks(
      '<https://example.com/unsubscribe>, <https://example.com/unsubscribe>, <mailto:unsubscribe@example.com>, <http://example.com>, <https://user:pass@example.com>, <https://127.0.0.1/>, <https://foo.local/>, <javascript:alert(1)>',
    ),
  ).toEqual(['https://example.com/unsubscribe'])
  expect(fetchMock).not.toHaveBeenCalled()
})

it('trashes only exact confirmed message IDs and verifies the saved labels', async () => {
  fetchMock
    .mockResolvedValueOnce(response({}))
    .mockResolvedValueOnce(response({ id: 'a1', labelIds: ['TRASH'] }))
    .mockResolvedValueOnce(response({ id: 'b2', labelIds: ['TRASH'] }))
  await trashMessages('synthetic', ['a1', 'b2'], new AbortController().signal)
  const [url, options] = fetchMock.mock.calls[0]
  expect(url).toMatch(/messages\/batchModify$/)
  expect(options.method).toBe('POST')
  expect(JSON.parse(options.body)).toEqual({
    ids: ['a1', 'b2'],
    addLabelIds: ['TRASH'],
    removeLabelIds: ['INBOX'],
  })
  expect(fetchMock.mock.calls.slice(1).map(([path]) => path)).toEqual([
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/a1?format=minimal',
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/b2?format=minimal',
  ])
})

it.each([
  { ids: [] },
  { ids: ['../delete'] },
  { ids: Array.from({ length: 1001 }, () => 'a1') },
])(
  'rejects invalid or oversized batches before network access',
  async ({ ids }) => {
    await expect(
      trashMessages('synthetic', ids, new AbortController().signal),
    ).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  },
)

it('does not claim success when read-back disagrees or returns a different ID', async () => {
  fetchMock
    .mockResolvedValueOnce(response({}))
    .mockResolvedValueOnce(response({ id: 'a1', labelIds: ['INBOX'] }))
  await expect(
    trashMessages('synthetic', ['a1'], new AbortController().signal),
  ).rejects.toThrow('Not every message')
  fetchMock
    .mockResolvedValueOnce(response({}))
    .mockResolvedValueOnce(response({ id: 'b2', labelIds: ['TRASH'] }))
  await expect(
    trashMessages('synthetic', ['a1'], new AbortController().signal),
  ).rejects.toThrow('Not every message')
})

it.each([401, 403, 429, 500])(
  'surfaces Gmail failures without leaking response contents (%s)',
  async (status) => {
    fetchMock.mockResolvedValue(
      response({ error: 'private provider detail' }, status),
    )
    await expect(
      loadInboxPage('synthetic', new AbortController().signal),
    ).rejects.not.toThrow('private provider detail')
  },
)

it('rejects malformed Gmail metadata and cancelled reads', async () => {
  fetchMock.mockResolvedValueOnce(response({ messages: [{ id: '../evil' }] }))
  await expect(
    loadInboxPage('synthetic', new AbortController().signal),
  ).rejects.toThrow()
  const controller = new AbortController()
  controller.abort()
  fetchMock.mockClear()
  await expect(loadInboxPage('synthetic', controller.signal)).rejects.toThrow(
    'cancelled',
  )
  expect(fetchMock).not.toHaveBeenCalled()
})
