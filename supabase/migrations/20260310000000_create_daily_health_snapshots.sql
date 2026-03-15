-- 003: Create daily_health_snapshots table for health metric persistence
-- Stores daily aggregated health data to enable 30/90-day trend analysis

CREATE TABLE IF NOT EXISTS public.daily_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  steps INTEGER,
  calories NUMERIC(8,2),
  sleep_minutes INTEGER,
  hrv NUMERIC(6,2),
  resting_hr NUMERIC(5,2),
  heart_rate NUMERIC(5,2),
  water_liters NUMERIC(5,3),
  recovery_score INTEGER CHECK (recovery_score >= 0 AND recovery_score <= 100),
  strain_score NUMERIC(4,1) CHECK (strain_score >= 0 AND strain_score <= 21),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- One snapshot per date
  CONSTRAINT daily_health_snapshots_date_unique UNIQUE (date)
);

-- Index for date range queries (trend lookups)
CREATE INDEX IF NOT EXISTS daily_health_snapshots_date_idx
  ON public.daily_health_snapshots (date DESC);

-- Auto-update timestamps (reuse existing function from exercises migration)
DROP TRIGGER IF EXISTS update_daily_health_snapshots_updated_at ON public.daily_health_snapshots;
CREATE TRIGGER update_daily_health_snapshots_updated_at
  BEFORE UPDATE ON public.daily_health_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.daily_health_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads and writes for now (matches weight_entries pattern)
CREATE POLICY "Allow anonymous read access on daily_health_snapshots"
  ON public.daily_health_snapshots
  FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert access on daily_health_snapshots"
  ON public.daily_health_snapshots
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update access on daily_health_snapshots"
  ON public.daily_health_snapshots
  FOR UPDATE
  USING (true);

CREATE POLICY "Allow anonymous delete access on daily_health_snapshots"
  ON public.daily_health_snapshots
  FOR DELETE
  USING (true);
