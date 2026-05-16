# Gym App Context

This app helps people plan workouts, record completed training, and track lightweight health signals over time. Use the following domain language consistently in code, UI copy, docs, issues, and pull requests.

## Domain language

### Exercise
A planned or recorded movement within a workout, including its name, sets, reps, variation, and optional load.

### Health Snapshot
A daily summary of health signals such as steps, calories, sleep, heart rate, hydration, flights climbed, and workouts.

### HealthKit Demo Data
Seeded or simulated health data shown when HealthKit data is unavailable or unauthorized. Demo data should stay clearly separate from user-recorded history.

### Hydration Entry
A water-intake record for a specific date and time, measured in milliliters and compared with the user's daily goal.

### Hyrox Benchmark
A timed attempt at one of the standard Hyrox stations (e.g. 1km Run, SkiErg 1000m, Sled Push), optionally with a weight in kg. Used to track personal records and gap to competitive amateur targets.

### Pillar
One of the three training categories used by the hybrid-athlete dashboard: **Strength**, **Run**, **Conditioning**. Every Training Session is classified into exactly one pillar (or excluded as recovery / multisport).

### Readiness
Today's HRV, resting heart rate, and sleep hours combined with their 7-day baselines, the deltas vs baseline, and a derived 0–100 recovery score. Readiness is the single answer to "how recovered am I?"

### Today's Suggestion
A short headline + reason naming the recommended pillar for today, derived from Readiness and the most recent Training Session via a pure decision cascade.

### Training Load
Volume of training over time, used to compute the Acute:Chronic Workload Ratio (**ACWR** = last 7 days ÷ trailing 28-day average ÷ 4). 0.8–1.3 is "optimal", outside that range is "low" or "high".

### Training Session
A normalised view of a completed workout from any source — HealthKit cardio, Workout Session strength logs, future imports. Carries pillar, start time, duration, and optional distance. Drives Weekly Volume and Training Load.

### Weekly Volume
Per-pillar minutes, session count, and week-over-week delta for the current Mon–today window. Compared against auto-calibrated weekly targets that adapt from the trailing 4 weeks.

### Weight Entry
A body-weight measurement recorded for a specific date, with an optional note.

### Workout Session
A user's active or completed workout built from one or more exercises. A session tracks exercise progress, cardio minutes, and completion status.

## Terminology stewardship

Prefer these domain terms over implementation-only names. Update this context when app-facing code, documentation, or data models introduce or rename domain concepts.
