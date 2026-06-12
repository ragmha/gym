/**
 * Zod schemas — single barrel re-export for `@/lib/validators`.
 *
 * Each domain lives in its own file. Import from this barrel to preserve
 * the existing `@/lib/validators` path everywhere in the codebase, or
 * import from the per-domain module directly for tighter coupling.
 */
export * from './exercises'
export * from './healthSnapshots'
export * from './meals'
export * from './coach'
export * from './workoutSessions'
