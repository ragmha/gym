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

### AI Coach

An on-device coaching assistant that generates daily insights, post-workout feedback, and conversational guidance based on health metrics, recovery signals, and workout history. Uses Apple Foundation Models on iOS or mock fallback on other platforms.

### Coach Insight

A daily AI-generated motivational or advisory message with a headline, body text, actionable suggestion, and tone (celebrate, steady, caution). Delivered on-device and cached to reduce redundant inference.

### Workout Narration

Post-workout AI-generated summary with headline, performance commentary, and next-session tip. Includes tone indicator and is based on workout efficiency metrics and recovery state.

### Workout Efficiency

Performance metrics for a completed session: total volume, set completion rate, session density (kg/min), top sets per exercise, and volume change vs prior session.

## Terminology stewardship

Prefer these domain terms over implementation-only names. Update this context when app-facing code, documentation, or data models introduce or rename domain concepts.
