/**
 * Food database Module — barcode → nutrition lookup.
 *
 * Mock adapter for now. Future adapter swaps to Open Food Facts API
 * (https://world.openfoodfacts.org/) without changing callers.
 */
import type { ParsedMeal } from '@/lib/validators'

export interface BarcodeLookup {
  lookup(barcode: string): Promise<ParsedMeal | null>
}

/** Tiny seed catalogue of common barcodes. */
const SEED: Record<string, Omit<ParsedMeal, 'ai_confidence'>> = {
  '5060469981420': {
    name: 'Grenade Protein Bar — White Chocolate',
    calories_kcal: 213,
    protein_g: 21,
    carb_g: 18,
    fat_g: 7,
  },
  '5410076721023': {
    name: 'Greek Yogurt 170g',
    calories_kcal: 100,
    protein_g: 17,
    carb_g: 6,
    fat_g: 0,
  },
  '722252100610': {
    name: 'Clif Bar — Chocolate Chip',
    calories_kcal: 250,
    protein_g: 9,
    carb_g: 44,
    fat_g: 5,
  },
  '8809223210011': {
    name: 'Coconut Water 330ml',
    calories_kcal: 60,
    protein_g: 1,
    carb_g: 14,
    fat_g: 0,
  },
}

export const mockBarcodeLookup: BarcodeLookup = {
  async lookup(barcode: string): Promise<ParsedMeal | null> {
    await new Promise((r) => setTimeout(r, 150))
    const seed = SEED[barcode]
    if (!seed) return null
    return { ...seed, ai_confidence: 0.95 }
  },
}

export function getActiveBarcodeLookup(): BarcodeLookup {
  return mockBarcodeLookup
}
