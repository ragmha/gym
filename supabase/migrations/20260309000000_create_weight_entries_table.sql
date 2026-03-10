-- 002: Create weight_entries table for body weight tracking
-- Stores daily weight entries with optional notes

CREATE TABLE IF NOT EXISTS public.weight_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- One entry per date
  CONSTRAINT weight_entries_date_unique UNIQUE (date)
);

-- Index for date range queries (chart lookups)
CREATE INDEX IF NOT EXISTS weight_entries_date_idx ON public.weight_entries (date DESC);

-- Auto-update timestamps (reuse existing function from exercises migration)
DROP TRIGGER IF EXISTS update_weight_entries_updated_at ON public.weight_entries;
CREATE TRIGGER update_weight_entries_updated_at
  BEFORE UPDATE ON public.weight_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads and writes for now (matches exercises table policy)
CREATE POLICY "Allow anonymous read access on weight_entries"
  ON public.weight_entries
  FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert access on weight_entries"
  ON public.weight_entries
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on weight_entries"
  ON public.weight_entries
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow anonymous delete access on weight_entries"
  ON public.weight_entries
  FOR DELETE
  USING (true);
