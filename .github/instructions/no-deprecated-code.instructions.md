---
applyTo: '**/*.{ts,tsx,js,jsx,mjs}'
description: 'Never generate or use deprecated APIs. Always verify methods are not deprecated before calling them. Fix deprecated calls in any lines you touch.'
---

# No Deprecated Code

## Hard Rule

**Never generate or commit code that uses deprecated APIs.** This applies to every file edit and code generation.

## Before Writing Any API Call

1. Verify the method is **not deprecated** in the installed version.
2. Check for `@deprecated` JSDoc tags or TypeScript TS6385/TS6387 warnings.
3. Use the modern replacement from the library's migration guide.

## Common Deprecated Patterns in This Project

### Zod v4 (installed: ^4.x)

Chained string validators are deprecated. Use top-level schemas:

```ts
// DEPRECATED — do not use
z.string().uuid()
z.string().email()
z.string().url()
z.string().datetime()

// CORRECT — use these instead
z.uuid()
z.email()
z.url()
z.iso.datetime()
```

### React / Expo

- `Constants.manifest` → `Constants.expoConfig`
- `defaultProps` on function components → default parameter values
- `@ts-ignore` → `@ts-expect-error`

## On Every Edit

- Fix deprecated calls in lines you modify, even if not asked.
- Run `bun run typecheck` and check for deprecation warnings before committing.

## Full Reference

See `.github/skills/no-deprecated-code/SKILL.md` for complete lookup tables and verification workflow.
