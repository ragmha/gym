import { mobile } from '@e2e-dev/mobile'
import type { E2EConfig } from 'e2e'
import { copilot } from 'e2e/oauth/copilot'

// ponytail: iOS simulator + installed dev client only. Agent steps use the
// local `bunx e2e login github-copilot` session, which is not for CI.
export default {
  tests: 'e2e/**/*.e2e.ts',
  // Already gitignored; editing .gitignore would change the native fingerprint.
  output: 'test-results/e2e',
  cache: { dir: 'test-results/e2e-cache' },
  agents: { default: { model: copilot('claude-sonnet-5') } },
  targets: [
    {
      name: 'ios',
      // Pinned: never the paired iPhone, with real Health data and logs.
      engine: mobile({ platform: 'ios', device: 'iPhone 17 Pro' }),
      app: {
        bundleId: 'io.raghib.gym',
        launchArguments: [
          '--initialUrl',
          'http://localhost:8081',
          '-EXDevMenuShowsAtLaunch',
          'NO',
          '-EXDevMenuIsOnboardingFinished',
          'YES',
          '-EXDevMenuShowFloatingActionButton',
          'NO',
        ],
        command: {
          executable: 'bunx',
          args: ['expo', 'start', '--port', '8081'],
        },
        readyUrl: 'http://localhost:8081/status',
      },
    },
  ],
  workers: 1,
} satisfies E2EConfig
