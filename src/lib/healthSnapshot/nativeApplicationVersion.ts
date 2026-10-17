export function supportsNativeApplicationVersion(
  version: string | null | undefined,
  minimumVersion: string,
): boolean {
  const versionParts = parseVersion(version)
  const minimumParts = parseVersion(minimumVersion)
  if (!versionParts || !minimumParts) return false
  for (let index = 0; index < minimumParts.length; index += 1) {
    if (versionParts[index] > minimumParts[index]) return true
    if (versionParts[index] < minimumParts[index]) return false
  }
  return true
}

function parseVersion(version: string | null | undefined): number[] | null {
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version))
    return null
  const parts = version.split('.').map(Number)
  return parts.every(Number.isSafeInteger) ? parts : null
}
