-- 001: Create exercises table with RLS
-- Extracted from seed.sql and hardened with Row Level Security

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the exercises table
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day TEXT NOT NULL,
  week TEXT NOT NULL,
  title TEXT NOT NULL,
  "videoURL" TEXT,
  cardio JSONB NOT NULL DEFAULT '{"morning": 0, "evening": 0}',
  exercises JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS exercises_day_week_idx ON public.exercises (day, week);
CREATE INDEX IF NOT EXISTS exercises_title_idx ON public.exercises USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS exercises_exercises_idx ON public.exercises USING GIN (exercises);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_exercises_updated_at ON public.exercises;
CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Allow anonymous (anon) and authenticated users to read all exercises.
-- Exercise definitions are shared/public data (workout templates).
CREATE POLICY "exercises_select_all"
  ON public.exercises
  FOR SELECT
  USING (true);

-- Only authenticated users can insert exercises
CREATE POLICY "exercises_insert_authenticated"
  ON public.exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update exercises
CREATE POLICY "exercises_update_authenticated"
  ON public.exercises
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated users can delete exercises
CREATE POLICY "exercises_delete_authenticated"
  ON public.exercises
  FOR DELETE
  TO authenticated
  USING (true);
