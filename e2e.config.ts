import { mobile } from '@e2e-dev/mobile'
import type { E2EConfig } from 'e2e'
import { copilot } from 'e2e/oauth/copilot'
import { getIosSimulatorUdid } from './e2e/ios-simulator'

// ponytail: iOS simulator + installed dev client only. Agent steps use the
// local `bunx e2e login github-copilot` session, which is not for CI.
const iosSimulatorUdid = getIosSimulatorUdid('iPhone 17 Pro')

export default {
  tests: 'e2e/**/*.e2e.ts',
  // Already gitignored; editing .gitignore would change the native fingerprint.
  output: 'test-results/e2e',
  cache: { dir: 'test-results/e2e-cache' },
  agents: { default: { model: copilot('claude-sonnet-5') } },
  targets: [
    {
      name: 'ios',
      // Pin the simulator UDID; a device name can also select a connected phone.
      engine: mobile({ platform: 'ios', device: iosSimulatorUdid }),
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
