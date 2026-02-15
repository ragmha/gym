#!/usr/bin/env python3
"""Generate seed.sql from exercises.json for the normalized schema.

Tables seeded:
  - workout_days          (1 row per program day)
  - exercise_definitions  (1 row per exercise within a day)
"""
import json
import os

script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)

with open(os.path.join(project_dir, "src/data/exercises.json")) as f:
    data = json.load(f)

lines = []

lines.append("-- Seed data for normalized gym schema")
lines.append("-- Auto-generated from exercises.json — do not edit by hand")
lines.append("")
lines.append("TRUNCATE TABLE public.workout_days CASCADE;")
lines.append("")
lines.append(f"-- Insert {len(data)} workout days")

for item in data:
    day = item["day"]
    week = item["week"]
    title = item["title"].replace("'", "''")
    video = item.get("videoURL", "")
    video_val = f"'{video.replace(chr(39), chr(39)+chr(39))}'" if video else "NULL"
    morning = item["cardio"]["morning"]
    evening = item["cardio"]["evening"]

    lines.append(
        f"INSERT INTO public.workout_days (day, week, title, video_url, cardio_morning, cardio_evening) "
        f"VALUES ({day}, {week}, '{title}', {video_val}, {morning}, {evening});"
    )

lines.append("")
lines.append("-- Insert exercise definitions")

exercise_count = 0
for item in data:
    day = item["day"]
    week = item["week"]
    for idx, ex in enumerate(item.get("exercises", []), start=1):
        ex_title = ex["title"].replace("'", "''")
        sets_raw = ex.get("sets", 1)
        is_amrap = "true" if sets_raw == "To Failure" else "false"
        sets = 1 if sets_raw == "To Failure" or sets_raw is None else int(sets_raw)
        reps = int(ex["reps"])
        variation = ex.get("variation")
        if variation and str(variation).lower() != "null":
            variation_val = f"'{str(variation).replace(chr(39), chr(39)+chr(39))}'"
        else:
            variation_val = "NULL"

        lines.append(
            f"INSERT INTO public.exercise_definitions "
            f"(workout_day_id, sort_order, title, sets, is_amrap, reps, variation) "
            f"VALUES ("
            f"(SELECT id FROM public.workout_days WHERE day = {day} AND week = {week}), "
            f"{idx}, '{ex_title}', {sets}, {is_amrap}, {reps}, {variation_val});"
        )
        exercise_count += 1

output_path = os.path.join(project_dir, "supabase/seed.sql")
with open(output_path, "w") as f:
    f.write("\n".join(lines) + "\n")

print(f"Generated {len(data)} workout days + {exercise_count} exercise definitions -> {output_path}")
