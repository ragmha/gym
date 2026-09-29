import {
  BodyMassWriteError,
  bodyMassUnavailable,
  validateBodyMassEntry,
  type BodyMassWriter,
} from '@/lib/healthSnapshot/bodyMass'

export const bodyMassWriter: BodyMassWriter = {
  getAvailability: () => bodyMassUnavailable('platform'),
  async save(entry) {
    validateBodyMassEntry(entry)
    throw new BodyMassWriteError('platform')
  },
}
