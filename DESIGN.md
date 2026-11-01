# Design System: Gym

## One system: minimal red and black

Gym uses a quiet, minimal, data-first visual language: black, white and neutral
gray, with red as the only accent. Clear hierarchy, compact rows and generous
whitespace replace decorative panels. Reuse platform
system sans-serif and the bundled Space Mono; do not add remote fonts,
dependencies or new product features to imitate reference artwork. Preserve
real measurements, honest unavailable states, existing interactions and
simple outline icons.

## Shared tokens

`src/constants/Colors.ts` and `src/constants/DesignSystem.ts` are the source of
truth. Screens use `useTheme()`, not private palettes or hardcoded colors.

| Role           | Light     | Dark      |
| -------------- | --------- | --------- |
| Page           | `#F5F5F5` | `#000000` |
| Panel          | `#FFFFFF` | `#111111` |
| Inset          | `#F0F0F0` | `#1A1A1A` |
| Essential text | `#1A1A1A` | `#E8E8E8` |
| Secondary text | `#666666` | `#999999` |
| Border / track | `#D6D6D6` | `#333333` |
| Red accent     | `#C8102E` | `#FF4D55` |
| Text on accent | `#FFFFFF` | `#000000` |

The same red identity uses an accessible darker tone on light surfaces and a
brighter tone on OLED-black surfaces. Red marks active controls, measured
progress, confirmed goal completion, key highlights and alerts. Ordinary
readings, success copy, historical intensity scales and chart tracks are
neutral. Status must also have a label or icon: red alone does not distinguish
selection, warning and failure. Do not reintroduce green success or yellow
warning palettes.

Neutral filled actions remain available where a reading or toolbar calls for
them; use `text` and `background` as the contrasting pair. A filled red action
uses `accent` and `selectedText`. Never assume white text works on the dark
theme's red.

External exercise images and user-selected media retain their actual contents.
Their backdrops use the shared `mediaSurface` / `videoBackground` tokens;
modal dimming uses `scrim`. Do not recolor data or fabricate reference media.

## Typography

Use the system sans-serif for headings, body text and large measurements.
All large values use tabular numerals with light weight, including Weight.
Space Mono is reserved for compact instrument labels, captions and data rows.
It is not a body font. Uppercase label treatment is typography, not stored data.

| Role              | Size / line height | Weight     |
| ----------------- | ------------------ | ---------- |
| Largest reading   | 88 / 96            | 300        |
| Large reading     | 64 / 72            | 300        |
| Medium reading    | 48 / 56            | 300        |
| Page heading      | 32 / 40            | 700        |
| Section heading   | 24 / 30            | 700        |
| Subsection        | 20 / 26            | 700        |
| Compact heading   | 17 / 24            | 600        |
| Body              | 17 / 25            | 400        |
| Supporting copy   | 14 / 21            | 400        |
| Instrument labels | 12 / 18 or 11 / 14 | Space Mono |

Respect Dynamic Type. Allow explanations to wrap; stack metadata and readings
at large sizes rather than squeezing or truncating them.

## Layout, surfaces and controls

Use a 4pt spacing base, 24pt page gutters, a 720pt content maximum and safe-area
insets. Shared radii are 4, 8, 12 and 16pt; pills and circular day controls use
`Radii.pill`. Goal tiles keep their shared SVG geometry across Home and Gym.

Surfaces are flat. Spacing, neutral surface contrast and visible boundaries
establish hierarchy, not shadows, blur, gradients or native elevation.
Important controls have at least a 48pt target and an accessible name, role and
state. Navigation stays in the root stack; do not introduce a tab bar.

Primary buttons use clear labels and a minimum 48pt height. Selected chips use
red with the corresponding on-accent text token. Unselected chips use neutral
surfaces. Inputs use tabular values, a visible boundary and explicit labels.
Preserve entered values when a save fails.

Motion communicates a user-caused state change, measured progress or
completion. Honor Reduce Motion. Do not add looping decoration, entrance
effects, animated glows or moving background artwork. Today priority Glyph
Progress is the one-shot exception for measured progress: when a lit segment
count loads or changes, those segments fade in left to right (150 ms each,
40 ms apart, ease-out); refreshes with the same count do not replay it.

## Screen composition

Home is a horizontal pager, not a vertical scroll: Today is the first page,
then an iOS-style icon grid containing only Steps, Gym, Reading, Praying and
Speaking, with page dots in the footer. Four columns of
outline icons sit under Space Mono names, or three larger columns when every
icon fits on one page (icons scale with column width, up to 96pt). Steps and
Gym are ordinary circular icon tiles; their readings appear on their detail
screens, and measured goal progress uses the same red circle fill as other
goal tiles. Rows spread over the full page height (never fewer than two when
text is large), and extra icons flow to further pages. Long-press drag and
accessibility move actions keep persisted icon ordering. A running Reading timer
replaces its icon's name with its red status, as iOS does for a loading app.
Tiles retain existing destinations and honest measured progress; the red fill
rises only when a real goal exists. The tappable Home icons use circular
surfaces with monochrome dot-matrix symbols; navigation glyphs keep their
outline treatment. Red remains reserved for progress and active states.
Today scrolls within its page only when its disclosures overflow it.

Today is a Calendar-led agenda, not a generic task list. The greeting is quiet
Space Mono, with the Steps + Gym percentage as its single large, unboxed
Space Mono readout. Its outlined goal-count badge and full-width Glyph Progress
bar share the same instrument language: twenty square segments, one
per completed five percentage points; the number retains the precise whole
percentage. Unknown progress shows `--` with no segments, not an empty zero bar. Do not
turn the reading into decorative artwork or an invented score. Underneath,
use uppercase mono labels for the agenda and Morning, Afternoon and Night
headings, with thin separators between periods and readable system-font event
titles. Empty periods keep their availability text on the same row. Anytime
is only for genuinely undated, overdue or all-day items.
Suggestions remain explicitly Suggested, not booked.
Calendar rows are read-only; only actual Reminders have pending and
native-confirmed checkboxes. Keep the Activity disclosure, four-reading bento,
All activities expansion, connection/setup disclosures and visible errors.
The shared Home header groups its 48pt refresh and Settings controls beside
the mono date. Header and footer navigation use neutral outline glyphs in
thin-bordered technical buttons, while the current page dot is red.
Disclosures keep neutral chevrons; red is reserved for progress, active states
and alerts, not every navigation affordance.

Weight uses the same light system reading, red goal emphasis and flat chart
language as other detail screens. Historical bars are neutral; the latest
measured bar is red. Preserve the dashed goal line, range tabs, explicit add
action and neutral BMI gauge without health verdicts.

Water and Food retain their approved ephemeral inputs and explicit Apple
Health save. Coach uses shared text and surfaces; its user bubble is red with
the on-accent text token. Settings uses the same inset groups and controls.
Speaking uses a static outline microphone, not topic-specific colorful orbs.
Achievement categories remain distinct through their silhouettes and linework,
with flat neutral fills and red earned outlines, not gradients or glossy medals.

## Native surfaces

Widgets, Live Activities and the Watch remote follow the same black/neutral/red
direction with system type and legible values. Compiled widget layouts execute
in an isolated context: their self-contained palette must mirror the shared
dark tokens, not define another identity. Widget readings and expiry semantics
must not change for styling. The OLED-black Watch remote mirrors the same dark
red and neutral track tokens. Watch set segments represent actual logged sets;
open-ended sets must not imply a percentage.

Native modifications require runtime isolation and a new compatible binary.
Do not claim an exported web page or mocked widget layout proves native render,
accessibility or tap behavior.

## Acceptance

- Inspect both themes on narrow screens and at large text sizes.
- Check readable text contrast, visible selected states and 48pt controls.
- Verify named actions, destinations, Back paths and pending/error states.
- Keep `--` for unavailable readings and preserve observed zeroes.
- Preserve HealthKit boundaries, platform gates, local-only logs and Reduce Motion.
- Audit for hardcoded colors, private palettes, gradients, glows and non-system
  fonts outside the shared tokens; document the isolated widget constraint.
- Report missing native or browser render/tap evidence as unverified.
