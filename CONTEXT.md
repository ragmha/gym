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

### Weight Entry
A body-weight measurement recorded for a specific date, with an optional note.

### Workout Session
A user's active or completed workout built from one or more exercises. A session tracks exercise progress, cardio minutes, and completion status.

### Widget Snapshot
A serialized daily summary written by the app into App Group storage for iOS widgets. It includes steps, step goal, workout XP, and last workout timestamp.

### Live Activity
An iOS-only real-time workout surface (Lock Screen + Dynamic Island) that mirrors active workout state: workout name, exercise, set progress, and rest countdown.

## Terminology stewardship

Prefer these domain terms over implementation-only names. Update this context when app-facing code, documentation, or data models introduce or rename domain concepts.
