---
version: alpha
name: Gym
description: A quiet, iOS-first goal dashboard with expressive progress tiles, restrained blue actions, and readable health summaries.
colors:
  primary: '#245BDB'
  primary-dark: '#8AB4FF'
  text: '#171923'
  text-dark: '#F4F6FA'
  background: '#F7F8FA'
  background-dark: '#11151D'
  home-background: '#FFFFFF'
  home-background-dark: '#000000'
  panel: '#FFFFFF'
  panel-dark: '#1B202B'
  surface: '#F0F2F6'
  surface-dark: '#262E3C'
  muted: '#626773'
  muted-dark: '#AFB7C6'
  border: '#DDE1E8'
  border-dark: '#394252'
  success: '#236747'
  success-dark: '#83D7AB'
  warning: '#865711'
  warning-dark: '#EBC17C'
  danger: '#B42335'
  danger-dark: '#FF9AAA'
  goal-track: '#DEDEE2'
  goal-track-dark: '#262626'
  goal-fill: '#F4C6C8'
  goal-fill-dark: '#681F22'
  goal-complete: '#D84242'
  goal-on-complete: '#090909'
  goal-progress-text: '#B52F33'
  goal-progress-text-dark: '#EF7171'
  progress: '#3478F6'
  progress-dark: '#8AB4FF'
  weight-bar-start: '#C98500'
  weight-bar-start-dark: '#FFC400'
  weight-bar-end: '#D9461F'
  weight-bar-end-dark: '#FF4D1A'
  weight-goal-text: '#9A5B00'
  weight-goal-text-dark: '#FFC400'
typography:
  display-xl:
    fontSize: 88px
    fontWeight: 800
    lineHeight: 96px
    letterSpacing: -3px
    fontFeature: '"tnum"'
  display-lg:
    fontSize: 64px
    fontWeight: 300
    lineHeight: 72px
    letterSpacing: -2px
  display-md:
    fontSize: 48px
    fontWeight: 300
    lineHeight: 56px
    letterSpacing: -1.4px
  heading-xl:
    fontSize: 32px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: -0.8px
  heading-lg:
    fontSize: 24px
    fontWeight: 700
    lineHeight: 30px
    letterSpacing: -0.4px
  heading-md:
    fontSize: 20px
    fontWeight: 700
    lineHeight: 26px
  heading-sm:
    fontSize: 17px
    fontWeight: 600
    lineHeight: 24px
  heading-xs:
    fontSize: 14px
    fontWeight: 600
    lineHeight: 18px
  body-lg:
    fontSize: 18px
    fontWeight: 400
    lineHeight: 26px
  body-md:
    fontSize: 17px
    fontWeight: 400
    lineHeight: 25px
  body-sm:
    fontSize: 14px
    fontWeight: 400
    lineHeight: 21px
  label-lg:
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
  label-md:
    fontSize: 12px
    fontWeight: 600
    lineHeight: 18px
  label-sm:
    fontSize: 11px
    fontWeight: 600
    lineHeight: 14px
  numeric-lg:
    fontSize: 40px
    fontWeight: 300
    lineHeight: 48px
    letterSpacing: -0.8px
    fontFeature: '"tnum"'
  numeric-md:
    fontSize: 28px
    fontWeight: 400
    lineHeight: 36px
    fontFeature: '"tnum"'
rounded:
  sm: 10px
  md: 14px
  lg: 18px
  xl: 24px
  panel: 28px
  pill: 999px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  xxxl: 40px
components:
  primary-action:
    backgroundColor: '{colors.primary}'
    textColor: '#FFFFFF'
    typography: '{typography.label-lg}'
    rounded: '{rounded.pill}'
    height: 48px
  icon-button:
    textColor: '{colors.primary}'
    rounded: '{rounded.pill}'
    width: 48px
    height: 48px
  panel:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.text}'
    rounded: '{rounded.panel}'
    padding: 20px
  settings-row:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.text}'
    typography: '{typography.body-md}'
    height: 64px
    padding: 16px
  numeric-input:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.text}'
    typography: '{typography.numeric-md}'
    rounded: '{rounded.md}'
    height: 64px
  goal-tile:
    backgroundColor: '{colors.home-background}'
    textColor: '{colors.text}'
    rounded: 20px
  goal-tile-complete:
    backgroundColor: '{colors.goal-complete}'
    textColor: '{colors.goal-on-complete}'
    rounded: 20px
  selected-chip:
    backgroundColor: '{colors.primary}'
    textColor: '#FFFFFF'
    typography: '{typography.label-md}'
    rounded: '{rounded.pill}'
  calendar-day:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.pill}'
    width: 44px
    height: 44px
  coach-user-bubble:
    backgroundColor: '{colors.primary}'
    textColor: '#FFFFFF'
    typography: '{typography.body-md}'
    rounded: '{rounded.pill}'
    padding: 16px
---

# Design System: Gym

## Overview

**Creative North Star: "The Goal Board"**

Gym is a calm daily dashboard organized around visible progress, not a wall of
identical metric cards. A clean canvas lets each goal tile carry the visual
weight; restrained blue actions and generous spacing keep navigation and health
readings clear.

The Home screen is a paginated, reorderable goal grid. Completion is expressed
with a solid red tile; incomplete progress uses a soft red fill. Detail screens
use the same theme-aware surfaces, readable type, and rounded controls.

**Key Characteristics:**

- Goal tiles are the signature visual; blue marks actions, links, progress strokes, and metric accents.
- Light and dark themes use distinct, explicit surfaces; the dark Home canvas is black.
- Large readings are light-weight and tabular; labels remain quiet and legible.
- Motion communicates progress, completion, or user-controlled rearrangement.

**The Goal Board Rule.** Make progress scannable before adding decoration.

## Colors

### Primary

- **Action blue — light (#245BDB):** Primary actions, links, selected controls, and progress strokes.
- **Action blue — dark (#8AB4FF):** The same action roles in dark mode.

### Secondary

- **Goal red (#D84242):** Completed goal tiles only.
- **Progress blush — light (#F4C6C8), dark (#681F22):** Incomplete goal fill; keep the track distinguishable.

### Tertiary

- **Success — light (#236747), dark (#83D7AB):** Confirmed positive status.
- **Warning — light (#865711), dark (#EBC17C):** Cautionary status and calorie-related metric accents.
- **Danger — light (#B42335), dark (#FF9AAA):** Errors and heart-related metric accents.

### Neutral

- **Page ground — light (#F7F8FA), dark (#11151D):** General screen background.
- **Home ground — light (#FFFFFF), dark (#000000):** Goal-grid canvas.
- **Panel — light (#FFFFFF), dark (#1B202B):** Grouped content surfaces.
- **Inset surface — light (#F0F2F6), dark (#262E3C):** Quiet grouped areas and tracks.
- **Primary text — light (#171923), dark (#F4F6FA):** Headings and essential values.
- **Secondary text — light (#626773), dark (#AFB7C6):** Supporting labels and iconography.
- **Border — light (#DDE1E8), dark (#394252):** Input and panel boundaries.

**The Meaning Rule.** Status colors communicate actual status; never use them as generic decoration.

## Typography

- **Display:** Platform system sans-serif; light 64px and 48px styles for exceptional readings. The heavy 88px `display-xl` belongs to the Weight screen exception only.
- **Headings:** 32px page title, 24px section title, 20px subsection, and 17px compact heading.
- **Body:** 17px standard copy; 18px spacious copy; 14px supporting copy.
- **Labels:** 14px, 12px, and 11px semibold styles for actions and compact metadata.
- **Numeric:** 40px and 28px tabular-number styles for measurements.
- **Gym accent:** The loaded SpaceMono face is reserved for selected Gym captions and compact values, not general body copy.

React Native uses its platform system font by default; these type tokens are
styles, not a request to set a custom font family globally. Allow explanatory
text to wrap at larger Dynamic Type sizes.

**The Reading Rule.** Use tabular numerals for changing measurements so values remain easy to compare.

## Layout

Use a 24px page gutter, a 720px content maximum for wide layouts, and a 4px
spacing base. Keep important controls at least 48px square. Respect safe-area
insets rather than positioning screens with fixed top offsets.

Home presents two columns by three rows of goal tiles per page, with pagination
for the remaining tile. The Gym hub uses a two-column tile grid. Settings groups
related controls inside inset panels; detail pages scroll instead of compressing
their content.

**The Breathing Room Rule.** Keep controls and explanations readable before filling unused space.

## Elevation & Depth

Use the soft panel shadow, `0 6px 24px rgba(24, 29, 43, 0.06)`, sparingly on
raised panels. The Home goal board stays flat; rely on surface contrast and tile
outlines rather than floating cards. Avoid stacking shadows or adding native
elevation to theme-aware surfaces.

**The Single Lift Rule.** Elevation marks a panel boundary, not every component boundary.

## Shapes

Use the shared 10px, 14px, 18px, 24px, and 28px radii for small controls through
large panels. Pill controls are fully rounded. Goal tiles use a 20px outline
radius; day cells are circular.

**The Shape Rule.** Keep repeated controls consistent within a screen; do not mix arbitrary corner radii.

## Components

### Buttons

Primary actions use the blue accent, white text, pill shape, and a 48px minimum
height. Contextual save actions may be 56px high. Icon controls are circular
with a 48px target and an outline icon.

### Chips

Selected date and filter chips use a filled accent and clear text contrast.
Unselected chips remain quiet and must still expose their state accessibly.

### Cards and containers

Panels use theme-aware surfaces, 28px corners, and 20–24px internal spacing.
Goal tiles are the main Home containers and use an outlined progress track,
upward fill, and solid completion state.

### Inputs

Numeric inputs use tabular values, a clear 1px boundary, 14px corners, and at
least 64px height. Pair labels with inputs and preserve entered values when an
error is shown.

### Navigation

Use the root stack and 48px back controls. Keep outline icons, concise labels,
and visible selected states; do not introduce a tab bar.

### Signature components

Today is a **Calendar-led agenda**, not a generic to-do list or a wall of cards.
Keep the user's explicitly selected **Steps + Gym** progress card unchanged:
the same percentage, goal-count badge, 96px 10-by-10 lavender matrix, rounded
panel and material gradient. The dots represent only Steps and Gym; Reminders
and other habits must not acquire invented progress scores.

Beneath it, follow the later minimal agenda reference: bold **Morning**,
**Afternoon** and **Night** headings, generous separation and simple open rows.
Use **Anytime** only for genuinely undated, overdue or all-day items, never
invented scheduling. Actual Calendar events, reserved work and HSL journeys
are fixed items; proposed activities fit free Calendar gaps and always say
**Suggested**, never booked. Do not add another Up next card or duplicate Inbox.
Calendar and proposed rows have outline icons, not completion checkboxes.
Only native Reminders have checkboxes, with a pending state and native-confirmed
checkmark; completed titles are muted. No optimistic completion or local task
store. Calendar items remain read-only.

Preserve the scoped `TodayColors` charcoal/lavender identity and both themes.
The agenda uses a clean page rather than individually boxed tasks. A local-time
greeting remains; the Home header already supplies the date. Secondary readings
live under **Activity**, retaining the four-reading bento and **All activities**
expansion without competing with the agenda. Steps and Sleep use lavender fills;
Active energy and Water are neutral. No invented charts or measurements.
Connection permissions, commute setup, refresh and provenance stay available
through clearly named disclosures, not default explanatory paragraphs.
Actual read/save/routing errors, urgent reminder counts and missing/partial
commute coverage remain visible. Preserve leave-by and Live/Timetable semantics.

Today scrolls vertically inside the existing current-day Home pager; goal pages
still follow horizontally and retain their red completion treatment. Historical
Home behavior is unchanged. Keep outline icons, 48pt controls, scalable labels
and `--` for unavailable readings. At large text sizes, stack readings and
metadata instead of squeezing columns. All disclosure and pending states are
ephemeral; no Calendar/Reminders content is persisted or sent to the Health coach.

- **Goal tile:** SVG outline, upward progress fill, solid red completion, and a short completion bounce.
- **Tile badge:** Outline play or stop glyph in a goal tile's top-right corner when a tap starts or stops a timer.
- **Gym tile:** Reuses the goal-tile treatment with restrained uppercase SpaceMono captions.
- **Calendar day:** 44px circular target with accessible date and activity labels.
- **Coach bubble:** Pill-shaped blue user message; keep assistant content on the quiet surface.
- **Rest timer:** Pill track using goal-track and completion colors.
- **Achievement medal:** Original enamel illustration with distinct silhouettes and medal-specific colors.

### Apple Watch

The watch logger follows the approved red-on-black reference rather than the
phone's blue action palette. A rounded, segmented system-red ring surrounds
large white sets/reps and kilograms; each completed set lights one segment.
Only sets/reps and load sit inside the circle. The centre is the log button.
A second native page holds status, reps, load and Undo.
Open-ended exercises show a neutral red track and the actual set count, not
invented percentage completion. Keep the native clock and back navigation,
accessible button labels, and scrollable editing controls. Accessibility text
sizes use a scrollable layout instead of squeezing values into the ring. No
heart rate, timer or per-side plate estimate is implied by the reference.

### Weight screen exception

`/gym/weight` and its add-weight form follow the approved black-and-yellow
reference rather than the quiet palette. A heavy `display-xl` reading sits over
yellow goal text (`weight-goal-text`). Trend bars use a warm yellow-to-red
gradient (`weight-bar-start` to `weight-bar-end`), with the latest bar in
primary text, a dashed goal line and a circular add control. The warm colours
mark the user's own trend and goal, not health status, so the BMI gauge stays
neutral and gives no verdict. Use these tokens nowhere else.

## Do's and Don'ts

### Do:

- **Do** use `Colors`, `Typography`, `Spacing`, `Radii`, and `Layout` tokens from `src/constants/`.
- **Do** check both themes, text contrast, Dynamic Type wrapping, and Reduce Motion behavior.
- **Do** keep the outline-icon treatment and preserve accessible names and touch targets.
- **Do** reserve red tile completion for completed goals.

### Don't:

- **Don't** restore the former Home layout of a step reading plus a floating metrics panel.
- **Don't** use blue for decorative status or red for generic emphasis.
- **Don't** add looping or entrance motion; honor reduced-motion preferences.
- **Don't** copy legacy hardcoded colors or native shadows into new components.
- **Don't** truncate explanatory copy or imply that a missing health reading is zero.
