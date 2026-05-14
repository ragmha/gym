---
name: supabase-migration
description: 'Guides safe Supabase schema changes across SQL migrations, generated DB types, Zod validators, and stores. Use when adding tables, changing columns, writing RLS policies, or regenerating database types.'
---

# Supabase Migration

## Quick start

```bash
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_<description>.sql
bun run db:migrate
bun run generate-types
bun run db:debug
```

## Workflow

1. Create one timestamped SQL file in `supabase/migrations/` with snake_case table and column names.
2. Add `created_at` and `updated_at` defaults when the table represents user-owned mutable data.
3. Enable RLS and define policies for the operations the app actually needs; policies should use `auth.uid()` for user ownership.
4. Apply the migration, then run `bun run generate-types` so `src/lib/database.types.ts` matches the database.
5. Update `src/lib/validators.ts` with matching Zod schemas and derive TypeScript types with `z.infer<>`.
6. Update stores to map database snake_case rows to app camelCase models explicitly.
7. Run `bun run db:debug` when environment variables are available to confirm Supabase auth, REST, and SDK access.

## Validation

Run:

```bash
bun run lint
bun run typecheck
bunx jest --runInBand
```

Review the migration against the generated types, validators, and store mappings before committing.

## Guardrails

- Never expose service-role keys to the client app.
- Do not bypass RLS from client-side code.
- Do not hand-edit generated database types except as a temporary diagnostic step that is reverted before commit.
- Do not leave validators looser than the database schema for required fields.
- Prefer additive migrations; flag dropped or renamed columns as breaking changes in the PR.
