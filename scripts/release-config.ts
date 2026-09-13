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
