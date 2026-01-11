# Gym 🏋️

A fitness tracking app built with React Native, Expo, and TypeScript. Track workouts, monitor progress, and stay motivated.

## Prerequisites

### Bun Package Manager

**macOS/Linux:**
```bash
curl -fsSL https://bun.sh/install | bash
```

**Windows (PowerShell):**
```bash
powershell -Command "irm bun.sh/install.ps1 | iex"
```

**Windows Subsystem for Linux (WSL):**
```bash
curl -fsSL https://bun.sh/install | bash
```

Or use your package manager:
- **Homebrew (macOS/Linux)**: `brew install bun`
- **Chocolatey (Windows)**: `choco install bun`
- **Scoop (Windows)**: `scoop install bun`

### Expo CLI

**All Platforms:**
```bash
bun install -g expo-cli
# or with npm/yarn
npm install -g expo-cli
```

## Quick Start

1. Install dependencies:
   ```bash
   bun install
   ```

2. Set environment variables in `.env.local`:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_key
   EXPO_PUBLIC_SUPABASE_PROJECT_ID=your_id
   ```

3. Run the app:
   ```bash
   bun run start      # Start dev server
   bun run ios        # Run on iOS
   bun run android    # Run on Android
   bun run web        # Run on web
   ```

## Common Commands

```bash
bun run test         # Run tests
bun run lint         # Lint code
bun run typecheck    # Type check
bun run db:migrate   # Run migrations
```

## Project Structure

```
src/
├── app/          # Routes and pages
├── components/   # React components
├── hooks/        # Custom hooks
├── stores/       # State management
├── types/        # TypeScript types
└── utils/        # Utilities
```

## License

MIT

---

For more info, see [open an issue](https://github.com/ragmha/gym/issues)
