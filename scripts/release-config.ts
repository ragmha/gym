import { z } from 'zod'
import { posix } from 'node:path'

const productionConfigSchema = z.looseObject({
  expo: z.looseObject({
    plugins: z
      .array(z.union([z.string(), z.tuple([z.string(), z.unknown()])]))
      .optional(),
    extra: z
      .looseObject({
        phoneRest: z
          .looseObject({ distributionApproved: z.boolean().optional() })
          .optional(),
      })
      .optional(),
  }),
})

export function assertProductionReleaseReady(appConfig: unknown): void {
  const { expo } = productionConfigSchema.parse(appConfig)
  const hasPhoneRest = expo.plugins?.some((plugin) => {
    const pluginPath = typeof plugin === 'string' ? plugin : plugin[0]
    return (
      typeof pluginPath === 'string' &&
      posix.normalize(pluginPath.replaceAll('\\', '/')).replace(/^\.\//, '') ===
        'modules/phone-rest/app.plugin.js'
    )
  })
  if (hasPhoneRest && expo.extra?.phoneRest?.distributionApproved !== true) {
    throw new Error(
      'Phone rest production releases are blocked. Confirm Family Controls distribution approval and provisioning for both io.raghib.gym and io.raghib.gym.PhoneRestReport, then explicitly set expo.extra.phoneRest.distributionApproved to true. A simulator build is not distribution approval.',
    )
  }
}

export function assertStaticAppConfig(
  rootFiles: readonly string[],
  location: string,
): void {
  // Reserve the namespace so newly supported Expo config formats cannot bypass the guard.
  if (rootFiles.some((file) => /^app\.config(?:\.|$)/i.test(file))) {
    throw new Error(
      `Only app.json is supported for runtime safety; ${location} contains an alternate Expo config.`,
    )
  }
}
