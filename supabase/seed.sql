-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_jsonschema";

-- Create the exercises table with improved structure
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day TEXT NOT NULL,
  week TEXT NOT NULL,
  title TEXT NOT NULL,
  videoURL TEXT,
  cardio JSONB NOT NULL,
  exercises JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  CONSTRAINT valid_cardio CHECK (
    json_matches_schema(
      '{
        "type": "object",
        "required": ["morning", "evening"],
        "properties": {
          "morning": {"type": "number"},
          "evening": {"type": "number"}
        }
      }',
      cardio::json
    )
  ),
  CONSTRAINT valid_exercises CHECK (
    json_matches_schema(
      '{
        "type": "array",
        "items": {
          "type": "object",
          "required": ["id", "title", "sets", "reps"],
          "properties": {
            "id": {"type": "string"},
            "title": {"type": "string"},
            "sets": {"type": ["string", "number"]},
            "reps": {"type": "number"},
            "variation": {"type": ["string", "null"]}
          }
        }
      }',
      exercises::json
    )
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS exercises_day_week_idx ON public.exercises (day, week);
CREATE INDEX IF NOT EXISTS exercises_title_idx ON public.exercises USING GIN (to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS exercises_exercises_idx ON public.exercises USING GIN (exercises);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update timestamps
DROP TRIGGER IF EXISTS update_exercises_updated_at ON public.exercises;
CREATE TRIGGER update_exercises_updated_at
    BEFORE UPDATE ON public.exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Delete existing data
TRUNCATE TABLE public.exercises RESTART IDENTITY CASCADE;

-- Insert data from exercises.json
INSERT INTO public.exercises (day, week, title, videoURL, cardio, exercises) 
SELECT 
  day,
  week,
  title,
  videoURL,
  cardio::jsonb,
  exercises::jsonb
FROM json_populate_recordset(null::record,
'[
  {"day":"1","week":"1","title":"Quads, Lower Abs & Calves","videoURL":"https://www.youtube.com/embed/P7ak9G2A8to","cardio":{"morning":20,"evening":20},"exercises":[{"id":"exercise-1","title":"Hack Squats","sets":3,"reps":15,"variation":"1.5 rep variation"},{"id":"exercise-2","title":"Squat Press","sets":3,"reps":15,"variation":"2-second pause at the bottom"},{"id":"exercise-3","title":"Leg Extensions","sets":3,"reps":10,"variation":"Drop Set"},{"id":"exercise-4","title":"Walking Forward Lunges","sets":"To Failure","reps":10,"variation":null},{"id":"exercise-5","title":"Bodyweight Squats","sets":"To Failure","reps":10,"variation":null},{"id":"exercise-6","title":"Walking Forward Lunges","sets":"To Failure","reps":10,"variation":null},{"id":"exercise-7","title":"Seated Calf Press","sets":5,"reps":30,"variation":null},{"id":"exercise-8","title":"Hanging Leg Raises","sets":"To Failure","reps":15,"variation":null},{"id":"exercise-9","title":"Lying Leg Raises","sets":"To Failure","reps":15,"variation":null}]},
  {"day":"2","week":"1","title":"Chest & Shoulders","videoURL":"https://www.youtube.com/embed/d9GJksb0o3c","cardio":{"morning":20,"evening":20},"exercises":[{"id":"exercise-1","title":"Dumbbell Chest Press","sets":3,"reps":15,"variation":"Drop Set"},{"id":"exercise-2","title":"Incline Cable Fly","sets":"To Failure","reps":12,"variation":null},{"id":"exercise-3","title":"Dumbbell Floor Press","sets":"To Failure","reps":15,"variation":null},{"id":"exercise-4","title":"Decline Dumbbell Fly","sets":"To Failure","reps":12,"variation":null},{"id":"exercise-5","title":"Pushups","sets":"To Failure","reps":15,"variation":null},{"id":"exercise-6","title":"Smith Machine Alternating Military Press","sets":"To Failure","reps":12,"variation":null},{"id":"exercise-7","title":"Lying Upright Cable Row","sets":"To Failure","reps":12,"variation":null},{"id":"exercise-8","title":"Lying Cable Side Raises","sets":"To Failure","reps":12,"variation":null},{"id":"exercise-9","title":"Lying Cable Front Raises","sets":"To Failure","reps":12,"variation":null},{"id":"exercise-10","title":"Bent-Over Cable Rear Delt Raises","sets":"To Failure","reps":10,"variation":null},{"id":"exercise-11","title":"Standing Rope Pulls","sets":"To Failure","reps":10,"variation":null}]}
]'::json);

-- Add more data in batches of 2-3 exercises to avoid query length limits
INSERT INTO public.exercises (day, week, title, videoURL, cardio, exercises) 
SELECT 
  day,
  week,
  title,
  videoURL,
  cardio::jsonb,
  exercises::jsonb
FROM json_populate_recordset(null::record,
'[
  -- Add more exercises here in batches
]'::json); 