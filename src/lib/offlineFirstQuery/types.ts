export interface OfflineFirstQueryOptions<TParsed> {
  query: () => Promise<{ data: unknown[] | null; error: unknown }>
  fallback: () => TParsed[]
  parse: (rows: unknown[]) => TParsed[]
  timeoutMs?: number
  fallbackOnEmpty?: boolean
}

export interface OfflineFirstQueryResult<TParsed> {
  data: TParsed[]
  usedFallback: boolean
  error: Error | null
}
