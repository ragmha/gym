/** The island countdown needs the iOS Live Activity extension. */
export function loadDeepWorkActivity():
  | typeof import('@/lib/deepWorkActivity')
  | null {
  return null
}
