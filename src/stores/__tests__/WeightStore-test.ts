import { kgToLbs, lbsToKg, validateWeightInput } from '@/stores/WeightStore'

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}))

describe('WeightStore interface helpers', () => {
  describe('validateWeightInput', () => {
    it('returns empty for blank input', () => {
      expect(validateWeightInput('   ', 'kg')).toEqual({
        ok: false,
        error: 'empty',
      })
    })

    it('returns invalid for non-numeric input', () => {
      expect(validateWeightInput('abc', 'kg')).toEqual({
        ok: false,
        error: 'invalid',
      })
    })

    it('returns out-of-range for values below the unit range', () => {
      expect(validateWeightInput('19.9', 'kg')).toEqual({
        ok: false,
        error: 'out-of-range',
      })
      expect(validateWeightInput('44.9', 'lbs')).toEqual({
        ok: false,
        error: 'out-of-range',
      })
    })

    it('returns out-of-range for values above the unit range', () => {
      expect(validateWeightInput('500.1', 'kg')).toEqual({
        ok: false,
        error: 'out-of-range',
      })
      expect(validateWeightInput('1100.1', 'lbs')).toEqual({
        ok: false,
        error: 'out-of-range',
      })
    })

    it('accepts valid kg input', () => {
      expect(validateWeightInput('82.5', 'kg')).toEqual({
        ok: true,
        weightKg: 82.5,
      })
    })

    it('accepts valid lbs input and converts it to kg', () => {
      const result = validateWeightInput('181.9', 'lbs')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.weightKg).toBeCloseTo(82.51, 2)
      }
    })
  })

  describe('kgToLbs/lbsToKg', () => {
    it('round-trips within rounding precision', () => {
      const kg = 82.5
      expect(lbsToKg(kgToLbs(kg))).toBeCloseTo(kg, 5)
    })
  })
})
