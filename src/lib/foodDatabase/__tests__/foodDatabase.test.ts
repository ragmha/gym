import { mockBarcodeLookup } from '../index'

describe('mockBarcodeLookup', () => {
  it('returns null for unknown barcode', async () => {
    const result = await mockBarcodeLookup.lookup('0000000000000')
    expect(result).toBeNull()
  })

  it('returns nutrition for a known barcode', async () => {
    const result = await mockBarcodeLookup.lookup('5060469981420')
    expect(result).not.toBeNull()
    expect(result?.name).toContain('Protein Bar')
    expect(result?.calories_kcal).toBeGreaterThan(0)
    expect(result?.ai_confidence).toBeGreaterThanOrEqual(0.9)
  })
})
