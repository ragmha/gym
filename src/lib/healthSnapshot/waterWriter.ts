import {
  WaterWriteError,
  validateWaterEntry,
  waterWriterUnavailable,
  type WaterWriter,
} from '@/lib/healthSnapshot/water'

export const waterWriter: WaterWriter = {
  getAvailability: () => waterWriterUnavailable('platform'),
  async save(entry) {
    validateWaterEntry(entry)
    throw new WaterWriteError('platform')
  },
}
