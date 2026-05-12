import type { OfflineFirstQueryOptions, OfflineFirstQueryResult } from './types'

type RemoteAdapterResult = { data: unknown[] | null; error: unknown }

function toError(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return new Error(error.message)
  }

  return new Error('Unknown error')
}

function queryWithTimeout(
  query: () => Promise<RemoteAdapterResult>,
  timeoutMs?: number,
): Promise<RemoteAdapterResult> {
  if (timeoutMs === undefined) return query()

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('timeout'))
    }, timeoutMs)

    query()
      .then(resolve, reject)
      .finally(() => clearTimeout(timeoutId))
  })
}

/**
 * Deep Module Interface at the fetch Seam: callers provide a remote Adapter,
 * fallback Adapter, and parse Implementation; lifecycle Locality keeps stores
 * Shallow while preserving Leverage.
 */
export async function offlineFirstQuery<TParsed>({
  query,
  fallback,
  parse,
  timeoutMs,
  fallbackOnEmpty = false,
}: OfflineFirstQueryOptions<TParsed>): Promise<
  OfflineFirstQueryResult<TParsed>
> {
  try {
    const { data, error } = await queryWithTimeout(query, timeoutMs)

    if (error) {
      return {
        data: fallback(),
        usedFallback: true,
        error: toError(error),
      }
    }

    const parsed = parse(data ?? [])

    if (fallbackOnEmpty && parsed.length === 0) {
      return {
        data: fallback(),
        usedFallback: true,
        error: null,
      }
    }

    return {
      data: parsed,
      usedFallback: false,
      error: null,
    }
  } catch (error) {
    return {
      data: fallback(),
      usedFallback: true,
      error: toError(error),
    }
  }
}
