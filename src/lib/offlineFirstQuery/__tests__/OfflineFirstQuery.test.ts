import { offlineFirstQuery } from '../OfflineFirstQuery'

describe('offlineFirstQuery', () => {
  it('returns parsed remote adapter rows when Supabase succeeds', async () => {
    const rawRows = [{ id: 'row-1' }]
    const parsedRows = [{ id: 'parsed-1' }]
    const parse = jest.fn(() => parsedRows)

    await expect(
      offlineFirstQuery({
        query: async () => ({ data: rawRows, error: null }),
        fallback: () => [{ id: 'fallback-1' }],
        parse,
      }),
    ).resolves.toEqual({
      data: parsedRows,
      usedFallback: false,
      error: null,
    })
    expect(parse).toHaveBeenCalledWith(rawRows)
  })

  it('returns fallback adapter rows when the remote adapter rejects', async () => {
    const rejection = new Error('network unavailable')
    const fallbackRows = [{ id: 'fallback-1' }]

    await expect(
      offlineFirstQuery({
        query: async () => {
          throw rejection
        },
        fallback: () => fallbackRows,
        parse: (rows) => rows as { id: string }[],
      }),
    ).resolves.toEqual({
      data: fallbackRows,
      usedFallback: true,
      error: rejection,
    })
  })

  it('returns fallback adapter rows when Supabase reports an error', async () => {
    const remoteError = new Error('missing table')
    const fallbackRows = [{ id: 'fallback-1' }]

    await expect(
      offlineFirstQuery({
        query: async () => ({ data: null, error: remoteError }),
        fallback: () => fallbackRows,
        parse: (rows) => rows as { id: string }[],
      }),
    ).resolves.toEqual({
      data: fallbackRows,
      usedFallback: true,
      error: remoteError,
    })
  })

  it('returns fallback adapter rows on timeout without awaiting the remote adapter', async () => {
    jest.useFakeTimers()
    const fallbackRows = [{ id: 'fallback-1' }]
    let remoteSettled = false

    try {
      const resultPromise = offlineFirstQuery({
        query: () =>
          new Promise((resolve) => {
            setTimeout(() => {
              remoteSettled = true
              resolve({ data: [{ id: 'late-row' }], error: null })
            }, 1_000)
          }),
        fallback: () => fallbackRows,
        parse: (rows) => rows as { id: string }[],
        timeoutMs: 50,
      })

      jest.advanceTimersByTime(50)
      await Promise.resolve()

      await expect(
        Promise.race([resultPromise, Promise.resolve('still-pending')]),
      ).resolves.toEqual({
        data: fallbackRows,
        usedFallback: true,
        error: new Error('timeout'),
      })
      expect(remoteSettled).toBe(false)
    } finally {
      jest.clearAllTimers()
      jest.useRealTimers()
    }
  })

  it('uses fallback adapter rows for an empty remote result when fallbackOnEmpty is true', async () => {
    const fallbackRows = [{ id: 'fallback-1' }]

    await expect(
      offlineFirstQuery({
        query: async () => ({ data: [], error: null }),
        fallback: () => fallbackRows,
        parse: (rows) => rows as { id: string }[],
        fallbackOnEmpty: true,
      }),
    ).resolves.toEqual({
      data: fallbackRows,
      usedFallback: true,
      error: null,
    })
  })

  it('returns empty remote adapter rows by default instead of falling back', async () => {
    await expect(
      offlineFirstQuery({
        query: async () => ({ data: [], error: null }),
        fallback: () => [{ id: 'fallback-1' }],
        parse: (rows) => rows as { id: string }[],
      }),
    ).resolves.toEqual({
      data: [],
      usedFallback: false,
      error: null,
    })
  })

  it('applies fallbackOnEmpty after parse filters remote adapter rows', async () => {
    const fallbackRows = [{ id: 'fallback-1' }]
    const query = async () => ({ data: [{ id: 'raw-1' }], error: null })
    const parse = () => []

    await expect(
      offlineFirstQuery({
        query,
        fallback: () => fallbackRows,
        parse,
        fallbackOnEmpty: true,
      }),
    ).resolves.toEqual({
      data: fallbackRows,
      usedFallback: true,
      error: null,
    })

    await expect(
      offlineFirstQuery({
        query,
        fallback: () => fallbackRows,
        parse,
      }),
    ).resolves.toEqual({
      data: [],
      usedFallback: false,
      error: null,
    })
  })
})
