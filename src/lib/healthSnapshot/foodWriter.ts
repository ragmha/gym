import {
  FoodWriteError,
  foodWriterUnavailable,
  validateFoodEntry,
  type FoodWriter,
} from '@/lib/healthSnapshot/food'

export const foodWriter: FoodWriter = {
  getAvailability: () => foodWriterUnavailable('platform'),
  async save(entry) {
    validateFoodEntry(entry)
    throw new FoodWriteError('platform')
  },
}
