# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Paw Trends is for one Owner recording observations about one Dog. The Owner uses it regularly on her iPhone to log Dog Activities, moods, symptoms, and surrounding conditions, then review possible associations in those observations.

## Product purpose

Paw Trends helps the Owner inspect associations between her Dog's moods and recorded conditions. Version 1 succeeds when she can install the private Site on an iPhone, reopen it offline, sustain daily logging, correct historical entries, preserve data through updates and backups, and inspect transparent, reproducible Associations once enough data exists.

Paw Trends reports associations from personal observations. It does not diagnose, give medical advice, or claim causation.

## Positioning

Paw Trends combines private, structured observation logging with a transparent personal Association model. It keeps observation data in the Owner's browser and explains the samples and raw values behind each result. Dog Mood is always an outcome, never a Factor, and every result is presented as an Association rather than a cause.

## Operating context

- Today is the default screen for current moods, Daily Check-in status, activity logging, and the day's chronological entries.
- The Owner logs Walks and Training after they occur. There is no live activity tracking.
- History supports reviewing, filtering, editing, deleting, and undoing deletion of past entries.
- Patterns first reports data readiness, then shows up to ten eligible Association cards when the sample thresholds are met.
- Settings manages the Dog's name, reusable labels, backup and restore, storage status, installation guidance, the Reaction Severity guide, schema version, and deletion of all data.
- The primary deployment is an owner-only ChatGPT Site used in iPhone Safari and from the Home Screen. The application shell works offline after an online load.

## Capabilities and constraints

- Version 1 has one Owner and one Dog in the interface. It has no accounts, application backend, cross-device synchronization, or server state.
- Observation data stays in IndexedDB on the device. The app sends no observation data to ChatGPT Sites, telemetry, analytics, advertising, or third-party APIs.
- JSON export and transactional restore provide explicit backup. Browser storage remains tied to the deployed Site origin and browser.
- The Owner can record Walks, Training, Dog Mood Intervals, Owner Mood Intervals, Daily Check-ins, Trigger Encounters, and reusable labels using the definitions in `CONTEXT.md`.
- Mood vocabularies and Reaction Severity values are fixed in version 1. User-created reusable labels retain the Owner's entered text.
- Associations use Pearson's correlation coefficient with documented eligibility thresholds, reproducible sample sets, and raw comparisons. The product does not calculate statistical significance, confidence, causation probability, or a composite wellness score.
- Calendar behavior uses the local date where an observation happened. A Mood Interval never carries into the next day.
- Derived Mood Interval end times and Association results are calculated from raw records rather than stored as source data.
- The application uses React and TypeScript, TanStack Start in client-only SPA mode, Vite+, Tailwind CSS, custom-composed shadcn components, Dexie, Zod, and `vite-plugin-pwa`. ChatGPT Sites hosts the static application.
- The interface is English-only in version 1. Localization, maps, live Walk tracking, automatic activity detection, operating-system notifications, standalone charts, and personal Dog photos are out of scope.

## Brand commitments

- The product name is Paw Trends.
- Product language follows `CONTEXT.md`. In particular, use Owner, Dog, Dog Activity, Walk, Training, Trigger, Trigger Encounter, Mood Interval, Factor, and Association as defined there.
- The interface must describe small-sample coincidences and the limits of personal observation plainly. It must not imply medical authority or causal findings.
- An original American Staffordshire Terrier illustration appears in onboarding and useful empty states. It is a bundled application asset and is decorative where it adds no information.

## Evidence on hand

- The canonical version 1 specification is GitHub issue #1: `https://github.com/orsolyafanni/paw-trends/issues/1`.
- `CONTEXT.md` defines the product's domain language and analytic concepts.
- `docs/adr/0001-keep-observation-data-local.md` records the local-only privacy and persistence decision.
- `docs/adr/0002-use-tanstack-start-and-vite-plus.md` records the application stack and hosting decision.
- The repository includes a working iPhone technical slice with IndexedDB persistence, persistent-storage requests, an offline application shell, JSON backup and restore, and WebMCP access to the sample observation.
- The final American Staffordshire Terrier illustration is required by the specification but is not yet present in the repository. Future work must not substitute a remote or personal Dog photo.
- No testimonials, customer claims, clinical evidence, or statistical-significance claims are available. Future work must not fabricate them.

## Product principles

1. Usability wins when study value conflicts with the Owner's ability to sustain daily use.
2. Keep observation data private, local, recoverable, and independent of an application account.
3. Make every Association inspectable and reproducible from the entries or days that counted.
4. Treat missing observations as unknown when the domain rules require it. Do not fill gaps or overstate what the data says.
5. Prefer explicit, correctable records over automatic inference or hidden scoring.

## Accessibility and inclusion

- The interface must remain usable at 200 percent zoom.
- Every control needs a programmatic label and visible keyboard focus.
- Touch targets must suit phone use, with particular attention to fast Trigger Encounter entry.
- Light and dark appearances follow the device setting and both require high contrast.
- Decorative illustrations use empty alternative text. Informative content must not depend on dog-related decoration.
