export interface Revision {
  commit: string
  appConfig: unknown
  packageVersion: unknown
}

interface ReleaseSafetyInput {
  base: Revision
  current: Revision
  newRuntime?: boolean
  detector: {
    previousCommit?: string
    currentCommit?: string
    previousFingerprint?: string
    currentFingerprint?: string
    diff?: string
  }
}

interface ReleaseDecision {
  action: 'update' | 'build'
  runtimeVersion: string
  message: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function parseOutput(value: string | undefined, name: string): unknown {
  if (!value) {
    throw new Error(`Missing ${name}; native compatibility is unknown.`)
  }
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`Invalid ${name}; native compatibility is unknown.`)
  }
}

function isFingerprintSource(value: unknown): boolean {
  if (!isRecord(value)) return false
  const hasIdentity =
    value.type === 'contents'
      ? isNonemptyString(value.id)
      : (value.type === 'file' || value.type === 'dir') &&
        isNonemptyString(value.filePath)
  return hasIdentity && (value.hash === null || isNonemptyString(value.hash))
}

function readFingerprint(value: string | undefined, name: string): string {
  const fingerprint = parseOutput(value, name)
  if (
    !isRecord(fingerprint) ||
    !isNonemptyString(fingerprint.hash) ||
    !Array.isArray(fingerprint.sources) ||
    fingerprint.sources.length === 0 ||
    !fingerprint.sources.every(isFingerprintSource) ||
    !fingerprint.sources.some(
      (source) => isRecord(source) && isNonemptyString(source.hash),
    )
  ) {
    throw new Error(`Unknown ${name}; a verified baseline is required.`)
  }
  return fingerprint.hash
}

function readNativeChange(input: ReleaseSafetyInput['detector']): boolean {
  const previousHash = readFingerprint(
    input.previousFingerprint,
    'previous fingerprint',
  )
  const currentHash = readFingerprint(
    input.currentFingerprint,
    'current fingerprint',
  )
  const diff = parseOutput(input.diff, 'fingerprint diff')
  if (
    !Array.isArray(diff) ||
    !diff.every((item: unknown) => {
      if (!isRecord(item)) return false
      if (item.op === 'added') return isFingerprintSource(item.addedSource)
      if (item.op === 'removed') return isFingerprintSource(item.removedSource)
      return (
        item.op === 'changed' &&
        isFingerprintSource(item.beforeSource) &&
        isFingerprintSource(item.afterSource)
      )
    })
  ) {
    throw new Error(
      'Invalid fingerprint diff; native compatibility is unknown.',
    )
  }
  const nativeChanged = previousHash !== currentHash
  if (nativeChanged !== diff.length > 0) {
    throw new Error('Fingerprint hashes and diff disagree; refusing release.')
  }
  return nativeChanged
}

export function assertCommit(commit: string): void {
  if (!/^[a-f0-9]{40}$/.test(commit) || /^0+$/.test(commit)) {
    throw new Error(
      'A known full Git commit is required for the runtime check.',
    )
  }
}

export function readVersion(
  { appConfig, packageVersion }: Revision,
  allowLegacy = false,
): number[] {
  const expo = isRecord(appConfig) ? appConfig.expo : undefined
  // Pre-OTA manifests reserve their versions, but must never become runtime anchors.
  const legacy =
    allowLegacy &&
    isRecord(expo) &&
    expo.runtimeVersion === undefined &&
    expo.sdkVersion === undefined &&
    expo.updates === undefined
  if (
    !isRecord(expo) ||
    (!legacy &&
      (!isRecord(expo.runtimeVersion) ||
        expo.runtimeVersion.policy !== 'appVersion'))
  ) {
    throw new Error('Release safety requires the appVersion runtime policy.')
  }
  for (const platform of ['ios', 'android']) {
    const config = expo[platform]
    if (
      config !== undefined &&
      (!isRecord(config) ||
        config.version !== undefined ||
        config.runtimeVersion !== undefined)
    ) {
      throw new Error(
        'Platform overrides must not bypass the appVersion runtime.',
      )
    }
  }
  if (
    typeof expo.version !== 'string' ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(expo.version)
  ) {
    throw new Error('The app version must use major.minor.patch format.')
  }
  const version = expo.version.split('.').map(Number)
  if (!version.every(Number.isSafeInteger)) {
    throw new Error('The app version contains an invalid version number.')
  }
  if (packageVersion !== expo.version) {
    throw new Error('app.json and package.json versions must match.')
  }
  return version
}

export function compareVersions(left: number[], right: number[]): number {
  const changedPart = left.findIndex((value, index) => value !== right[index])
  return changedPart === -1
    ? 0
    : Math.sign(left[changedPart] - right[changedPart])
}

export function evaluateReleaseSafety(
  input: ReleaseSafetyInput,
): ReleaseDecision {
  const { base, current, detector } = input
  assertCommit(base.commit)
  assertCommit(current.commit)
  if (
    detector.previousCommit !== base.commit ||
    detector.currentCommit !== current.commit
  ) {
    throw new Error(
      'Fingerprint commits do not match the checked release range.',
    )
  }
  const baseVersion = readVersion(base)
  const currentVersion = readVersion(current)
  const runtimeVersion = currentVersion.join('.')
  const versionChange = compareVersions(currentVersion, baseVersion)
  if (versionChange < 0) {
    throw new Error(
      'App versions must increase; an older runtime cannot be reused.',
    )
  }
  if (base.commit === current.commit && !input.newRuntime) {
    throw new Error('A release cannot authorize its own same-runtime OTA.')
  }
  const nativeChanged = readNativeChange(detector)
  if (nativeChanged && versionChange === 0) {
    throw new Error(
      'Native changes require a higher app version and a new native build before OTA.',
    )
  }
  if (nativeChanged || versionChange !== 0 || input.newRuntime) {
    return {
      action: 'build',
      runtimeVersion,
      message: `Runtime ${runtimeVersion} requires a new native build. Skipping OTA.`,
    }
  }
  return {
    action: 'update',
    runtimeVersion,
    message: `Native fingerprint and runtime ${runtimeVersion} are unchanged. OTA is allowed.`,
  }
}
