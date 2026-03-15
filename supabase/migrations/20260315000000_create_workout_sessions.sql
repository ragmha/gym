-- 004: Create workout_sessions table
-- Stores metrics for each completed workout: start time, duration, volume lifted

CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_day TEXT NOT NULL,
  exercise_week TEXT NOT NULL,
  title TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_volume_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
  sets_completed INTEGER NOT NULL DEFAULT 0,
  total_sets INTEGER NOT NULL DEFAULT 0,
  exercises_completed INTEGER NOT NULL DEFAULT 0,
  total_exercises INTEGER NOT NULL DEFAULT 0,
  cardio_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS workout_sessions_completed_at_idx
  ON public.workout_sessions (completed_at DESC);
CREATE INDEX IF NOT EXISTS workout_sessions_exercise_day_week_idx
  ON public.workout_sessions (exercise_day, exercise_week);

-- Auto-update timestamps
DROP TRIGGER IF EXISTS update_workout_sessions_updated_at ON public.workout_sessions;
CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Public read/write for now (same pattern as exercises table)
DROP POLICY IF EXISTS "Allow public read workout_sessions" ON public.workout_sessions;
CREATE POLICY "Allow public read workout_sessions"
  ON public.workout_sessions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert workout_sessions" ON public.workout_sessions;
CREATE POLICY "Allow public insert workout_sessions"
  ON public.workout_sessions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update workout_sessions" ON public.workout_sessions;
CREATE POLICY "Allow public update workout_sessions"
  ON public.workout_sessions FOR UPDATE
  USING (true);
