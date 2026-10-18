# Visual system

## Direction

The reference's white activity-detail screen informs the app's visual language:
generous space, ink headings, lighter-weight numbers, quiet gray labels, a
single blue accent, circular icon controls, and white panels with soft,
downward shadows. Its map, profile photograph, decorative line graph, floating
general-purpose add action, and tab bar are not part of this app. The later,
separately approved Add weight action is contextual to the weight reading.

The interface is primarily a daily reading surface. It presents the five Home
priorities without turning every reading into an identical card or implying
more data than Health provides. The sole manual-entry exception is the
user-approved body-mass save directly to Apple Health.

## Tokens

`src/constants/Colors.ts` defines both complete theme palettes.

| Role | Light | Dark |
| --- | --- | --- |
| Ink / primary text | `#171923` | `#F4F6FA` |
| Secondary text | `#626773` | `#AFB7C6` |
| Page ground | `#F7F8FA` | `#11151D` |
| Home / Steps / Coach ground | `#FFFFFF` | `#11151D` |
| Reading panel | `#FFFFFF` | `#1B202B` |
| Quiet icon / inset surface | `#F0F2F6` | `#262E3C` |
| Action blue | `#245BDB` | `#8AB4FF` |
| Progress stroke | `#3478F6` | `#8AB4FF` |

Action blue is darker than the reference's decorative blue in light mode so
small action labels remain legible. Status colors are reserved for actual
success, warning, or error meanings. The heatmap uses a four-level blue scale,
not completion colors.

`src/constants/DesignSystem.ts` contains the reusable structure:

- System sans-serif typography; no display-font dependency.
- 32-point bold page headings, 20–24-point section headings, 17-point body copy,
  and 14-point supporting copy at the standard text size.
- Light 64-point primary counts and 28–40-point secondary readings, with
  tabular numerals for measurements.
- A 24-point page gutter, a 720-point maximum reading width, and a 4-point
  spacing foundation.
- 28-point continuous panel corners and 48-point circular controls.
- Offset `boxShadow` styles: a subtle `0 6px 24px` panel shadow, not legacy
  native shadow or elevation properties.

## Screen patterns

- **Home:** date selection and Coach/Settings controls; an open, measured step
  reading; then one floating panel grouping Cardio, Lift, Water, and Morning
  weight. Training is a pair of separated rows, water is an inline reading,
  and weight has its own weekly comparison. All other metrics remain behind
  the existing navigation action.
- **Steps:** the same light, open reading treatment replaces the former black
  ring screen. One line measures the fixed step goal. Daily calorie and
  unavailable distance/minute readings are grouped below; there are no
  calorie-progress rings, invented distance, or estimated active minutes.
- **Achievements:** Personal records, Steps, Streaks, Workouts, Lifting, and
  Hydration sections in a three-column award grid. Original enamel-style
  illustrations use distinct silhouettes, vivid colors, and metallic outlines;
  locked awards show only muted linework. Milestone numbers are inset into the
  artwork. Values, first-earned dates, and progress stay below each award.
  Built from the past year of Health readings plus the on-device lifting log;
  pace and distance records are not shown.
- **Settings:** inset groups, a single Health-access action, and full-width
  theme radio rows. Authorization completion still does not claim read access.
- **Add weight:** an action beside Morning weight opens a focused modal in the
  same token system. It contains kilograms, the native date/time picker, a
  readable local timestamp, and explicit timestamp confirmation before
  **Save to Apple Health**. The current day defaults to now; past-day defaults
  are disclosed and must be confirmed as the actual measurement time. There
  are no invented morning timestamps. Saving exposes a busy state and blocks
  conflicting actions; inline errors retain input. A saved result explains
  separate read access and returns to the original selected Home day.
- **Coach:** a quiet conversation surface, accessible suggestion actions, an
  inset composer, and blue user messages. The date and on-device identity are
  visible; engine, context, streaming, and session lifetime are unchanged.
- **Unavailable/error screens:** neutral circular symbols, readable explanations,
  and a blue recovery action where one exists. The Phone rest JavaScript shell
  follows these styles; the native Screen Time report remains platform-owned
  and its privacy/distribution gates are unchanged.

## Interaction and accessibility

`ScreenHeader` provides consistent 48-point back controls without changing
stack presentations or back gestures. Scroll containers and native safe-area
views replace hardcoded top offsets on detail screens. The Coach composer
accounts for the bottom safe area and keyboard.

`DashboardText` remeasures glyphs and line boxes when Dynamic Type changes.
Content rows wrap instead of truncating explanatory text. Large counts may
fit their line, but the complete measured value remains in the accessible
label. At larger text sizes, the heatmap scrolls horizontally rather than
compressing its labels; each dated square exposes a relative activity level or
absence to assistive technology. These scores combine available steps and
workouts and are never labelled as measured step counts.

Normal small-text token combinations meet a 4.5:1 contrast ratio in both themes.
The step-progress stroke meets 3:1 against its track. Missing steps do not
mount a zero-progress indicator. Existing accessible names and test IDs are
retained, and new controls use explicit roles and labels.

The weight form does not submit on Enter or blur, and cancel/dismiss never
writes. It checks the immutable native binary capability before importing the
new picker; web, Android, and old/missing native builds get an explanation,
not a mock save. Its form state is ephemeral and its permission scope is only
Body Mass writing. No other health-entry form is authorized.

No new repeating or entrance animation is introduced. Navigation keeps its
platform transitions; data changes do not require motion to communicate state.

## Data boundaries and regression coverage

The redesign does not change HealthKit queries, daily goal logic, morning-weight
calculations, coach behavior, native capabilities, or stored preferences.
Missing values remain `--`, observed zeroes remain visible, StairMaster intensity
stays unverified, and the PPL program stays unconfigured.

While Home stays focused and active, a five-minute fallback catches delayed
workout imports missed by the native observer. Observer notifications, app
foregrounding, and pull-to-refresh do not wait for that fallback.
The shared snapshot hook refreshes on screen focus and owns the workout and
foreground listeners only while that route is focused. Covered stack screens
detach their listeners and cancel queued callbacks until they become visible
again, without duplicating Home's focus refresh.

The separately approved weight-entry feature adds a narrow writer port and the
native date/time/application dependencies, gated to compatible 1.0.7-or-later
binaries. The updated Expo native dependency stack uses runtime 1.0.8 and requires
a new binary, not an OTA to 1.0.6 or 1.0.7. Weight entry does not change
the read contract, morning-window calculations, or storage architecture. It
reports success only for an actual native saved body-mass sample, marks manual
entry with HealthKit metadata, and never manufactures a read-back value.

Unit/component coverage checks both theme palettes, small-text and progress
contrast, accessible touch targets, scrollable detail screens, theme selection,
loading/retry states, measured step progress, and heatmap sizing at standard
and large text scales. Existing behavioral tests remain the source of truth
for dates, Health access, streaming, workout sync, and missing data. Native and
browser visual inspection are separate from these structural checks.
