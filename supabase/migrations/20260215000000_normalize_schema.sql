-- Migration: normalize_schema
-- Splits the monolithic `exercises` table into:
--   workout_days          (1 row per program day)
--   exercise_definitions  (1 row per exercise within a day)
--   user_progress         (1 row per user×exercise completion)

-- ────────────────────────────────────────────────────────────────────
-- 1. Create normalized tables
-- ────────────────────────────────────────────────────────────────────

CREATE TABLE public.workout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day INTEGER NOT NULL,
  week INTEGER NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT,
  cardio_morning INTEGER NOT NULL DEFAULT 0,
  cardio_evening INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (day, week)
);

CREATE TABLE public.exercise_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_day_id UUID NOT NULL REFERENCES public.workout_days(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL,
  title TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 1,
  is_amrap BOOLEAN NOT NULL DEFAULT false,
  reps INTEGER NOT NULL,
  variation TEXT
);

CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL REFERENCES public.exercise_definitions(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  sets_completed BOOLEAN[] NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, exercise_id)
);

-- ────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ────────────────────────────────────────────────────────────────────

CREATE INDEX workout_days_day_week_idx ON public.workout_days (day, week);
CREATE INDEX exercise_definitions_workout_day_idx ON public.exercise_definitions (workout_day_id);
CREATE INDEX exercise_definitions_workout_day_sort_idx ON public.exercise_definitions (workout_day_id, sort_order);
CREATE INDEX user_progress_user_idx ON public.user_progress (user_id);
CREATE INDEX user_progress_user_exercise_idx ON public.user_progress (user_id, exercise_id);

-- ────────────────────────────────────────────────────────────────────
-- 3. Updated_at trigger (reuse function if it exists)
-- ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workout_days_updated_at
  BEFORE UPDATE ON public.workout_days
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ────────────────────────────────────────────────────────────────────
-- 4. Migrate data from old exercises table (if it exists)
-- ────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Only migrate data and drop the old table if it exists.
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'exercises'
  ) THEN

    INSERT INTO public.workout_days (id, day, week, title, video_url, cardio_morning, cardio_evening, created_at, updated_at)
    SELECT
      id,
      day::INTEGER,
      week::INTEGER,
      title,
      "videoURL",
      (cardio->>'morning')::INTEGER,
      (cardio->>'evening')::INTEGER,
      created_at,
      updated_at
    FROM public.exercises;

    INSERT INTO public.exercise_definitions (workout_day_id, sort_order, title, sets, is_amrap, reps, variation)
    SELECT
      e.id,
      ex.ordinality::INTEGER,
      ex.value->>'title',
      CASE
        WHEN ex.value->>'sets' = 'To Failure' OR ex.value->>'sets' IS NULL THEN 1
        ELSE (ex.value->>'sets')::INTEGER
      END,
      CASE
        WHEN ex.value->>'sets' = 'To Failure' THEN true
        ELSE false
      END,
      (ex.value->>'reps')::INTEGER,
      NULLIF(ex.value->>'variation', 'null')
    FROM public.exercises e,
    LATERAL jsonb_array_elements(e.exercises) WITH ORDINALITY AS ex(value, ordinality);

    -- ────────────────────────────────────────────────────────────────
    -- 5. Drop old table
    -- ────────────────────────────────────────────────────────────────
    DROP TABLE public.exercises CASCADE;

  END IF;
END
$$;

-- ────────────────────────────────────────────────────────────────────
-- 6. Row Level Security
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE public.workout_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read workout_days" ON public.workout_days
  FOR SELECT USING (true);

ALTER TABLE public.exercise_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read exercise_definitions" ON public.exercise_definitions
  FOR SELECT USING (true);

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON public.user_progress
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────
-- 7. Enable realtime on new tables
-- ────────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.workout_days;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exercise_definitions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_progress;
