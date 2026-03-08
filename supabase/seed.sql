-- Seed data for the exercises table
-- Run after applying migrations: supabase/migrations/
--
-- Usage (local):  supabase db reset
-- Usage (remote): psql <connection-string> -f supabase/seed.sql

TRUNCATE TABLE public.exercises RESTART IDENTITY CASCADE;

INSERT INTO public.exercises (day, week, title, "videoURL", cardio, exercises)
VALUES
  (
    '1', '1', 'Quads, Lower Abs & Calves',
    'https://www.youtube.com/embed/P7ak9G2A8to',
    '{"morning": 20, "evening": 20}'::jsonb,
    '[
      {"id": "exercise-1", "title": "Hack Squats", "sets": 3, "reps": 15, "variation": "1.5 rep variation"},
      {"id": "exercise-2", "title": "Squat Press", "sets": 3, "reps": 15, "variation": "2-second pause at the bottom"},
      {"id": "exercise-3", "title": "Leg Extensions", "sets": 3, "reps": 10, "variation": "Drop Set"},
      {"id": "exercise-4", "title": "Walking Forward Lunges", "sets": "To Failure", "reps": 10, "variation": null},
      {"id": "exercise-5", "title": "Bodyweight Squats", "sets": "To Failure", "reps": 10, "variation": null},
      {"id": "exercise-6", "title": "Walking Forward Lunges", "sets": "To Failure", "reps": 10, "variation": null},
      {"id": "exercise-7", "title": "Seated Calf Press", "sets": 5, "reps": 30, "variation": null},
      {"id": "exercise-8", "title": "Hanging Leg Raises", "sets": "To Failure", "reps": 15, "variation": null},
      {"id": "exercise-9", "title": "Lying Leg Raises", "sets": "To Failure", "reps": 15, "variation": null}
    ]'::jsonb
  ),
  (
    '2', '1', 'Chest & Shoulders',
    'https://www.youtube.com/embed/d9GJksb0o3c',
    '{"morning": 20, "evening": 20}'::jsonb,
    '[
      {"id": "exercise-1", "title": "Dumbbell Chest Press", "sets": 3, "reps": 15, "variation": "Drop Set"},
      {"id": "exercise-2", "title": "Incline Cable Fly", "sets": "To Failure", "reps": 12, "variation": null},
      {"id": "exercise-3", "title": "Dumbbell Floor Press", "sets": "To Failure", "reps": 15, "variation": null},
      {"id": "exercise-4", "title": "Decline Dumbbell Fly", "sets": "To Failure", "reps": 12, "variation": null},
      {"id": "exercise-5", "title": "Pushups", "sets": "To Failure", "reps": 15, "variation": null},
      {"id": "exercise-6", "title": "Smith Machine Alternating Military Press", "sets": "To Failure", "reps": 12, "variation": null},
      {"id": "exercise-7", "title": "Lying Upright Cable Row", "sets": "To Failure", "reps": 12, "variation": null},
      {"id": "exercise-8", "title": "Lying Cable Side Raises", "sets": "To Failure", "reps": 12, "variation": null},
      {"id": "exercise-9", "title": "Lying Cable Front Raises", "sets": "To Failure", "reps": 12, "variation": null},
      {"id": "exercise-10", "title": "Bent-Over Cable Rear Delt Raises", "sets": "To Failure", "reps": 10, "variation": null},
      {"id": "exercise-11", "title": "Standing Rope Pulls", "sets": "To Failure", "reps": 10, "variation": null}
    ]'::jsonb
  );