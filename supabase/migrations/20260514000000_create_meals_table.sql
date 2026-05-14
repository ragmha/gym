-- 005: Create meals table for nutrition tracking
-- Stores logged meals with macro breakdown, sourced from photo / barcode / manual entry.

CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  name TEXT NOT NULL,
  calories_kcal NUMERIC(7,2) NOT NULL CHECK (calories_kcal >= 0 AND calories_kcal < 10000),
  protein_g NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (protein_g >= 0 AND protein_g < 1000),
  carb_g NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (carb_g >= 0 AND carb_g < 1000),
  fat_g NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (fat_g >= 0 AND fat_g < 1000),
  source TEXT NOT NULL CHECK (source IN ('photo', 'barcode', 'manual')),
  photo_url TEXT,
  barcode TEXT,
  ai_confidence NUMERIC(3,2) CHECK (ai_confidence IS NULL OR (ai_confidence >= 0 AND ai_confidence <= 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for the most common access pattern: today's meals (or any date range)
CREATE INDEX IF NOT EXISTS meals_date_idx ON public.meals (date DESC, consumed_at DESC);

-- Auto-update timestamps (reuse function from earlier migration)
DROP TRIGGER IF EXISTS update_meals_updated_at ON public.meals;
CREATE TRIGGER update_meals_updated_at
  BEFORE UPDATE ON public.meals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;

-- Single-tenant for now; matches existing weight_entries / exercises pattern.
-- Tighten when user auth ships.
CREATE POLICY "Allow anonymous read access on meals"
  ON public.meals
  FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert access on meals"
  ON public.meals
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on meals"
  ON public.meals
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow anonymous delete access on meals"
  ON public.meals
  FOR DELETE
  USING (true);
