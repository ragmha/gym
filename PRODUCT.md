# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Product purpose

An iOS-first daily health dashboard. Its home screen helps the user
review steps, recorded cardio and lifting, water, and morning weight at a glance.
Apple HealthKit is the only source of real health data. Web and Android are
explicitly labelled, deterministic design previews.
The user approved one manual-entry exception: saving a confirmed body weight
and its actual measurement date/time directly to Apple Health.

## Capabilities and constraints

- Home, Steps, All metrics, Coach, and Settings share a date-aware navigation
  stack. There is no tab bar, account, or backend.
- **Add weight** beside Morning weight opens an ephemeral kilograms/date/time
  form on compatible iOS builds. Only an explicit **Save to Apple Health**
  requests body-mass write access and saves. It does not authorize other
  manual-entry features, local persistence, or editing/deleting Health samples.
- Native permission-request completion is not success. A native saved sample
  is required, errors preserve the form, and Home rereads Health on return.
  Saving can succeed without read-back access; unavailable readings stay honest.
- Current-day entries default to now. A past selected day uses a visibly
  disclosed current local clock time that the user must correct and confirm.
  Invalid/future times are prohibited. Afternoon readings remain afternoon
  readings and do not replace the earliest-before-noon morning measurement.
- Weight writing and its native date/time picker require a compatible immutable
  native version (1.0.7 or later with weight-entry modules). Old/missing native
  capabilities, web, and Android show an explicit unavailable explanation.
- Missing readings remain unavailable, not invented zeroes. Recorded zeroes
  remain visible. Workout duration and average heart rate do not prove time in
  a heart-rate zone.
- The existing PPL program has not been supplied; no schedule or completion is
  inferred. Morning weight comparisons show measured coverage, not diet advice.
- The on-device coach reads the existing daily context only.
- Theme selection, accessible controls, and light and dark appearances remain
  supported. The experimental Phone rest report retains its privacy and
  distribution restrictions.

## Visual commitment

The user supplied health-app references with white surfaces, bright-blue
accents, generous spacing, lighter numeric typography, and softly rounded
panels, and approved applying that visual language across the whole app.
Reference photos, maps, profile controls, and charts are not evidence that the
app has those assets, features, or measurements.

## Product principles

- Make the five daily priorities easy to scan.
- Read what Health already records rather than asking for duplicate entry.
- Limit manual input to the explicitly approved Apple Health body-mass save;
  all dashboard values continue to come back through HealthKit.
- Keep every visible measurement and completion state traceable to its source.
- Preserve native navigation, safe areas, and readable, scalable text.
