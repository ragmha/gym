import { supabase } from '@/lib/supabase'

import { useWeightStoreBase } from '../WeightStore'

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}))

type QueryResult = { data: unknown[] | null; error: Error | null }
type QueryResponse = QueryResult | Promise<QueryResult>
type MutationResult<TData> = { data: TData | null; error: Error | null }

const mockFrom = supabase.from as jest.Mock

function resetWeightStore() {
  useWeightStoreBase.setState({
    entries: [],
    loading: false,
    error: null,
    initialized: false,
    unit: 'kg',
    goalKg: null,
  })
}

function mockInitializeQuery(result: QueryResponse) {
  const limit = jest.fn(() => Promise.resolve(result))
  const order = jest.fn(() => ({ limit }))
  const select = jest.fn(() => ({ order }))
  mockFrom.mockReturnValue({ select })
  return { select, order, limit }
}

function mockAddEntry(result: Promise<MutationResult<{ id: string }>>) {
  const single = jest.fn(() => result)
  const select = jest.fn(() => ({ single }))
  const upsert = jest.fn(() => ({ select }))
  mockFrom.mockReturnValue({ upsert })
  return { upsert, select, single }
}

function mockDeleteEntry(result: Promise<MutationResult<null>>) {
  const eq = jest.fn(() => result)
  const deleteMock = jest.fn(() => ({ eq }))
  mockFrom.mockReturnValue({ delete: deleteMock })
  return { deleteMock, eq }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}

function expectMockEntries() {
  const { entries, initialized } = useWeightStoreBase.getState()

  expect(entries).toHaveLength(14)
  expect(entries.every((entry) => entry.id.startsWith('mock-'))).toBe(true)
  expect(initialized).toBe(true)
}

describe('WeightStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetWeightStore()
  })

  it('initialize populates entries from Supabase when the table has rows', async () => {
    mockInitializeQuery({
      data: [
        {
          id: 'weight-1',
          date: '2026-02-15',
          weight_kg: 82.25,
          note: 'after workout',
        },
      ],
      error: null,
    })

    await useWeightStoreBase.getState().initialize()

    expect(useWeightStoreBase.getState().entries).toEqual([
      {
        id: 'weight-1',
        date: '2026-02-15',
        weightKg: 82.25,
        note: 'after workout',
      },
    ])
    expect(useWeightStoreBase.getState().initialized).toBe(true)
    expect(useWeightStoreBase.getState().loading).toBe(false)
  })

  it('initialize falls back to mock entries when Supabase errors or rejects', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation()

    try {
      mockInitializeQuery({ data: null, error: new Error('missing table') })

      await useWeightStoreBase.getState().initialize()

      expectMockEntries()

      resetWeightStore()
      mockInitializeQuery(Promise.reject(new Error('offline')))

      await useWeightStoreBase.getState().initialize()

      expectMockEntries()
    } finally {
      warnSpy.mockRestore()
    }
  })

  it('initialize falls back to mock entries when Supabase returns empty rows', async () => {
    mockInitializeQuery({ data: [], error: null })

    await useWeightStoreBase.getState().initialize()

    expectMockEntries()
  })

  it('initialize is idempotent after the store is initialized', async () => {
    mockInitializeQuery({
      data: [
        {
          id: 'weight-1',
          date: '2026-02-15',
          weight_kg: 82,
          note: null,
        },
      ],
      error: null,
    })

    await useWeightStoreBase.getState().initialize()
    await useWeightStoreBase.getState().initialize()

    expect(mockFrom).toHaveBeenCalledTimes(1)
    expect(useWeightStoreBase.getState().entries).toEqual([
      {
        id: 'weight-1',
        date: '2026-02-15',
        weightKg: 82,
        note: null,
      },
    ])
  })

  it('addEntry optimistically writes locally and confirms with the Supabase id', async () => {
    const deferred = createDeferred<MutationResult<{ id: string }>>()
    const { upsert } = mockAddEntry(deferred.promise)

    const addPromise = useWeightStoreBase
      .getState()
      .addEntry(83.27, '2026-02-16', 'morning')

    expect(useWeightStoreBase.getState().entries).toEqual([
      {
        id: expect.stringMatching(/^temp-/),
        date: '2026-02-16',
        weightKg: 83.3,
        note: 'morning',
      },
    ])
    expect(upsert).toHaveBeenCalledWith(
      {
        date: '2026-02-16',
        weight_kg: 83.3,
        note: 'morning',
      },
      { onConflict: 'date' },
    )

    deferred.resolve({ data: { id: 'weight-remote' }, error: null })
    await addPromise

    expect(useWeightStoreBase.getState().entries).toEqual([
      {
        id: 'weight-remote',
        date: '2026-02-16',
        weightKg: 83.3,
        note: 'morning',
      },
    ])
  })

  it('deleteEntry optimistically removes locally and restores when Supabase rejects', async () => {
    const entry = {
      id: 'weight-1',
      date: '2026-02-16',
      weightKg: 83.3,
      note: 'morning',
    }
    useWeightStoreBase.setState({ entries: [entry], initialized: true })
    const deferred = createDeferred<MutationResult<null>>()
    const { eq } = mockDeleteEntry(deferred.promise)

    const deletePromise = useWeightStoreBase.getState().deleteEntry('weight-1')

    expect(useWeightStoreBase.getState().entries).toEqual([])
    expect(eq).toHaveBeenCalledWith('id', 'weight-1')

    deferred.reject(new Error('delete failed'))
    await deletePromise

    expect(useWeightStoreBase.getState().entries).toEqual([entry])
  })
})
