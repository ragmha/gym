/**
 * Zod schemas — single barrel re-export for `@/lib/validators`.
 *
 * The app reads from HealthKit and stores nothing, so the only values that
 * still need runtime validation are the ones the on-device coach generates.
 */
export * from './coach'
