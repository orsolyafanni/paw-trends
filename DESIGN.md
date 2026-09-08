---
name: Paw Trends
description: A calm, private field journal for one Owner and one Dog.
colors:
  forest: "#214a3c"
  paper: "#f5efe4"
  card: "#fffdf8"
  ink: "#17342c"
  rust: "#a65f38"
  sage: "#dce5d9"
  sand: "#ead9bc"
  muted-ink: "#586b63"
  rule: "#d4c7b4"
  destructive: "#9b392f"
typography:
  display:
    fontFamily: "Georgia, Cambria, 'Times New Roman', serif"
    fontSize: "clamp(2.5rem, 10vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Georgia, Cambria, 'Times New Roman', serif"
    fontSize: "1.45rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    lineHeight: 1.55
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.82rem"
    fontWeight: 750
rounded:
  control: "11px"
  inset: "12px"
  surface: "15px"
  feature: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.forest}"
    textColor: "{colors.card}"
    rounded: "{rounded.control}"
    height: "44px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "{spacing.lg}"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "46px"
---

# Design System: Paw Trends

## Overview

**Creative North Star: "The Calm Field Journal"**

Paw Trends treats private observations as careful journal entries rather than clinical records or dashboard telemetry. Warm paper, dark green ink, a restrained rust accent, and editorial serif headings give the product character while familiar controls keep regular phone use straightforward.

The interface is phone-first and information-dense only when the Owner asks for evidence. Primary tasks and current state remain easy to scan. Detailed records, Association samples, and destructive settings disclose progressively.

**Key characteristics:**

- Warm paper and card layers with high-contrast forest text.
- Journal-serif headings paired with a practical system sans for controls and data.
- Rounded, touch-sized controls and calm ambient elevation.
- Rust for context labels, forest for action and active state, sage for selected or explanatory data.

## Colors

The light palette resembles cream paper with forest ink. Dark appearance keeps the same roles using deep green-black surfaces, pale ink, warm brown secondary panels, and lighter rust.

### Primary

- **Field Journal Forest** (`#214a3c`): primary actions, active navigation, strength meters, and methodology surfaces.
- **Paper Cream** (`#f5efe4`): the application background and breathing room around entries.
- **Card Ivory** (`#fffdf8`): forms, observation groups, Association cards, and controls.

### Secondary

- **Context Rust** (`#a65f38`): activity context, dates, compact category labels, and negative-direction emphasis.
- **Quiet Sage** (`#dce5d9`): selected navigation, status icons, rank markers, and data bands.
- **Journal Sand** (`#ead9bc`): chips and compact comparison differences.

### Neutral

- **Forest Ink** (`#17342c`): headings and primary body text.
- **Muted Ink** (`#586b63`): supporting copy and metadata.
- **Paper Rule** (`#d4c7b4`): dividers and field boundaries.

### Named rules

**The Evidence Stays Inspectable Rule.** Summary values may lead, but any derived Association must expose the activities that counted and retain the units of its raw values.

**The Accent Has a Job Rule.** Forest marks action, selection, and method. Rust marks context or directional contrast. Neither color is scattered as decoration.

## Typography

**Display font:** Georgia with Cambria and Times New Roman fallbacks  
**Body font:** Inter when available, then the platform sans stack

The serif gives headings a handwritten-journal gravity without entering script or novelty territory. The sans carries labels, forms, navigation, and numeric evidence with predictable phone rendering.

### Hierarchy

- **Display** (600, `clamp(2.5rem, 10vw, 4.5rem)`, line-height 1): route and setup headings.
- **Title** (600, roughly `1.28rem` to `1.55rem`): card, section, and feature titles.
- **Body** (regular, `1rem`, line-height around 1.55): explanations and task copy, usually limited to 65–75 characters.
- **Label** (700–800, `0.75rem` to `0.9rem`): field labels, metadata, state, and controls. Numeric evidence uses tabular figures.

**The Two-Voice Rule.** Serif names the journal entry or question. Sans explains, measures, and acts on it.

## Layout

The installed application uses one centered content column, capped at 680px and inset 16px on narrow screens. Desktop keeps the same focused reading width rather than expanding into a dashboard grid. The fixed bottom navigation stays reachable above iPhone safe areas.

Spacing follows tight 8–16px groups inside controls, 18–24px inside feature surfaces, and 24–46px between major sections. At 620px, multi-column summaries and Association controls stack. At 560px, forms, history controls, and card headings simplify to one or two columns. At 420px, evidence rows and Mood lists become single-column where needed.

## Elevation & Depth

Depth is ambient and sparse. Cards use a soft downward shadow while forms and internal evidence areas use tonal layering or a single divider. A surface should use a shadow or a visible border as its main boundary, not both at equal weight.

### Shadow vocabulary

- **Journal card** (`0 14px 34px rgb(46 39 30 / 8%)`): standard status, form, and list surfaces.
- **Feature card** (`0 16px 36px rgb(46 39 30 / 9%)`): Association cards.
- **Primary action** (`0 13px 28px rgb(33 74 60 / 20%)`): prominent logging and completion actions.

## Shapes

Controls use an 11px radius, compact inset markers use 12–13px, and cards use 15–16px. Pills are reserved for chips and small states such as direction, never for full-size buttons or content containers. Circular shapes belong to the Paw Trends brand mark and compact icon buttons.

## Components

### Buttons

- Primary buttons use Field Journal Forest, Card Ivory text, an 11px radius, and a minimum 44px touch height.
- Outline and ghost variants preserve the same height and focus behavior.
- Every keyboard focus uses a 3px Field Journal Forest ring with a 3px offset.

### Chips

- Reusable labels use Journal Sand with dark secondary text and a compact pill silhouette.
- Status chips use Quiet Sage or a low-opacity Rust tint according to meaning.

### Cards and containers

- Standard cards use Card Ivory, a 15–16px radius, and ambient journal-card elevation.
- Association cards read in order: rank and relationship, evidence disclosure, normalized strength, raw comparison, then method and non-causation warning.
- Internal groups use dividers and tonal bands rather than nested card shadows.

### Inputs and fields

- Inputs use Card Ivory or Paper Cream according to their parent surface, a 1px input boundary, an 11px radius, and at least 44px height.
- Placeholder and help text use Muted Ink. Focus shifts the boundary to the ring color and keeps the global visible outline.

### Navigation

- The installed app uses four fixed bottom destinations with line icons and labels.
- Inactive destinations use Muted Ink. The current destination uses Field Journal Forest on Quiet Sage.
- The navigation respects bottom and side safe-area insets.

### Association evidence

- Direction and Pearson `r` remain separate from normalized absolute strength.
- Binary Factors compare Mood occurrence rates when present and absent. Numeric Factors compare average values with and without the Mood.
- The evidence region is labeled, keyboard-scrollable, and always includes units or Present/Absent values.

## Do's and Don'ts

### Do

- **Do** use the domain terms Owner, Dog, Dog Activity, Activity Mood, Factor, and Association exactly.
- **Do** preserve readable raw values, sample sizes, and units behind calculated summaries.
- **Do** keep phone controls at least 44px high and account for iPhone safe areas.
- **Do** follow the device light or dark appearance with the same semantic color roles.

### Don't

- **Don't** imply diagnosis, causation, statistical significance, or a wellness score.
- **Don't** use Dog Mood as a Factor.
- **Don't** replace the focused journal column with generic dashboard chrome.
- **Don't** use decorative motion, remote pet imagery, or dog motifs where they compete with the Owner's records.
