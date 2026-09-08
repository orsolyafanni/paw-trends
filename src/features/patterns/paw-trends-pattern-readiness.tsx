/* oxlint-disable no-use-before-define, jsx-a11y/no-noninteractive-tabindex -- The screen reads from leaf components, and the bounded evidence region must be keyboard-scrollable. */

import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Dumbbell,
  Footprints,
  ListChecks,
  Minus,
  PawPrint,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  PawTrendsDogMood,
  PawTrendsHistoryRecord,
  PawTrendsProbeStore,
} from "@/persistence/paw-trends-probe-store";
import { PAW_TRENDS_DOG_MOODS } from "@/persistence/paw-trends-probe-store";

import { calculatePawTrendsPatternReadiness } from "./paw-trends-pattern-readiness-model";
import { calculatePawTrendsActivityAssociations } from "./paw-trends-activity-associations-model";
import type { PawTrendsActivityAssociation } from "./paw-trends-activity-associations-model";

const PAW_TRENDS_PATTERN_COUNTS = [
  { icon: CalendarDays, key: "observedDays", label: "Observed Days" },
  { icon: Footprints, key: "walks", label: "Walks" },
  { icon: Dumbbell, key: "trainingSessions", label: "Training sessions" },
  {
    icon: ListChecks,
    key: "completedDailyCheckIns",
    label: "Completed Daily Check-ins",
  },
] as const;

/** Shows live observation counts and the Association sample threshold. */
export function PawTrendsPatternReadinessScreen({
  store,
}: {
  store: PawTrendsProbeStore;
}) {
  const [records, setRecords] = useState<PawTrendsHistoryRecord[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [moodFilter, setMoodFilter] = useState<"all" | PawTrendsDogMood>("all");

  useEffect(
    () =>
      store.observeHistoryRecords(
        (nextRecords) => {
          setRecords(nextRecords);
          setLoadFailed(false);
        },
        () => {
          setLoadFailed(true);
        }
      ),
    [store]
  );

  const readiness = useMemo(
    () => calculatePawTrendsPatternReadiness(records ?? []),
    [records]
  );
  const activityAssociations = useMemo(
    () =>
      calculatePawTrendsActivityAssociations(
        (records ?? [])
          .filter(
            (
              entry
            ): entry is Extract<
              PawTrendsHistoryRecord,
              { kind: "training" | "walk" }
            > => entry.kind === "training" || entry.kind === "walk"
          )
          .map((entry) => entry.record)
      ),
    [records]
  );
  const visibleAssociations = activityAssociations
    .map((association, index) => ({ association, rank: index + 1 }))
    .filter(
      ({ association }) =>
        moodFilter === "all" || association.mood === moodFilter
    );
  const hasEligibleAssociations = activityAssociations.length > 0;
  const hasObservations = readiness.totalRecords > 0;
  let readinessTitle = "Start with what happened.";
  let readinessDescription =
    "Log Dog Moods, Dog Activities, and Daily Check-ins. Paw Trends will count them here without drawing conclusions from an empty record.";
  if (readiness.moodSampleThresholdReached) {
    readinessTitle = "The mood sample threshold is met.";
    readinessDescription =
      "At least one Dog Mood has five samples with it and five without it. Each Factor still needs enough variation before an Association can qualify.";
  } else if (hasObservations) {
    readinessTitle = "Your record is taking shape.";
    readinessDescription =
      "These are the observations available today. More records may make a fair comparison possible, but a larger count does not prove a relationship.";
  }

  return (
    <main className="paw-app-content paw-secondary-screen paw-patterns-screen">
      <header>
        <div className="paw-brand-lockup paw-brand-lockup-compact">
          <span className="paw-brand-mark" aria-hidden="true">
            <PawPrint />
          </span>
          <span>Paw Trends</span>
        </div>
        <h1>Patterns</h1>
        <p>
          {hasEligibleAssociations
            ? "Review the strongest eligible comparisons in your activities."
            : "See what you have recorded and when comparisons can begin."}
        </p>
      </header>

      {loadFailed ? (
        <section className="paw-patterns-error" role="alert">
          <h2>Patterns could not read your observations.</h2>
          <p>Return to Patterns to try loading these counts again.</p>
        </section>
      ) : null}

      {hasEligibleAssociations ? (
        <PawTrendsActivityAssociationList
          associations={visibleAssociations}
          moodFilter={moodFilter}
          totalAssociations={activityAssociations.length}
          onMoodFilterChange={setMoodFilter}
        />
      ) : (
        <>
          <section
            className="paw-patterns-readiness"
            aria-busy={records === null}
            aria-labelledby="patterns-readiness-title"
          >
            <div className="paw-patterns-readiness-copy">
              <span className="paw-patterns-readiness-icon" aria-hidden="true">
                {readiness.moodSampleThresholdReached ? (
                  <CheckCircle2 />
                ) : (
                  <Sparkles />
                )}
              </span>
              <div>
                <h2 id="patterns-readiness-title">{readinessTitle}</h2>
                <p>{readinessDescription}</p>
              </div>
              {!hasObservations && records !== null ? (
                <img
                  alt=""
                  className="paw-dog-illustration paw-dog-illustration-patterns"
                  src="/paw-trends-amstaff.png"
                />
              ) : null}
            </div>

            <dl className="paw-pattern-counts" aria-label="Observation counts">
              {PAW_TRENDS_PATTERN_COUNTS.map(({ icon: Icon, key, label }) => (
                <div key={key}>
                  <dt>
                    <Icon aria-hidden="true" />
                    {label}
                  </dt>
                  <dd>{readiness[key]}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section
            className="paw-patterns-moods"
            aria-labelledby="patterns-moods-title"
          >
            <div>
              <h2 id="patterns-moods-title">Dog Mood occurrences</h2>
              <p>Each saved Dog Mood entry counts once.</p>
            </div>
            <dl aria-label="Dog Mood occurrence counts">
              {PAW_TRENDS_DOG_MOODS.map((mood) => (
                <div key={mood}>
                  <dt>{mood}</dt>
                  <dd>{readiness.dogMoodOccurrences[mood]}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      )}

      <aside
        className="paw-patterns-method"
        aria-labelledby="patterns-method-title"
      >
        <h2 id="patterns-method-title">When a comparison qualifies</h2>
        <p>
          A Dog Mood needs at least five matching samples and five samples
          without that mood. A yes-or-no Factor also needs at least five samples
          where it appears and five where it does not.
        </p>
        <p>
          Reaching those minimums only makes a calculation possible. An
          Association can be a coincidence, and it never shows that a Factor
          caused a Dog Mood.
        </p>
      </aside>
    </main>
  );
}

function formatPawTrendsAssociationValue(
  value: number,
  association: PawTrendsActivityAssociation
): string {
  if (association.comparison.format === "percentage") {
    return `${Math.round(value)}%`;
  }
  const roundedValue = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(1);
  return `${roundedValue} ${association.comparison.unit}`;
}

function isPawTrendsDogMoodFilter(
  value: string
): value is "all" | PawTrendsDogMood {
  return value === "all" || PAW_TRENDS_DOG_MOODS.some((mood) => mood === value);
}

function formatPawTrendsAssociationDifference(
  association: PawTrendsActivityAssociation
): string {
  const { difference } = association.comparison;
  const prefix = difference > 0 ? "+" : "";
  const roundedDifference = Number.isInteger(difference)
    ? difference.toString()
    : difference.toFixed(1);
  return `${prefix}${roundedDifference} ${association.comparison.unit}`;
}

function formatPawTrendsAssociationSampleValue(
  association: PawTrendsActivityAssociation,
  factorValue: number
): string {
  if (association.factorKind === "binary") {
    return factorValue === 1 ? "Present" : "Absent";
  }
  const roundedValue = Number.isInteger(factorValue)
    ? factorValue.toString()
    : factorValue.toFixed(1);
  return `${roundedValue} ${association.comparison.unit}`;
}

function formatPawTrendsPearsonR(value: number): string {
  if (value === 0) {
    return "0.00";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function getPawTrendsAssociationDirectionCopy(
  association: PawTrendsActivityAssociation
): string {
  if (association.direction === "positive") {
    return `${association.factor} was higher or more common with ${association.mood}.`;
  }
  if (association.direction === "negative") {
    return `${association.factor} was lower or less common with ${association.mood}.`;
  }
  return `${association.factor} had no linear direction with ${association.mood}.`;
}

function PawTrendsActivityAssociationList({
  associations,
  moodFilter,
  totalAssociations,
  onMoodFilterChange,
}: {
  associations: readonly {
    association: PawTrendsActivityAssociation;
    rank: number;
  }[];
  moodFilter: "all" | PawTrendsDogMood;
  totalAssociations: number;
  onMoodFilterChange: (mood: "all" | PawTrendsDogMood) => void;
}) {
  return (
    <section
      className="paw-associations"
      aria-labelledby="activity-associations-title"
    >
      <div className="paw-associations-heading">
        <div>
          <h2 id="activity-associations-title">
            Strongest activity Associations
          </h2>
          <p>
            {totalAssociations} eligible comparison
            {totalAssociations === 1 ? "" : "s"}, ranked by Pearson |r|.
          </p>
        </div>
        <label className="paw-association-filter">
          <span>Dog Mood</span>
          <span>
            <select
              value={moodFilter}
              onChange={(event) => {
                if (isPawTrendsDogMoodFilter(event.target.value)) {
                  onMoodFilterChange(event.target.value);
                }
              }}
            >
              <option value="all">All moods</option>
              {PAW_TRENDS_DOG_MOODS.map((mood) => (
                <option key={mood} value={mood}>
                  {mood}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" />
          </span>
        </label>
      </div>

      {associations.length === 0 ? (
        <div className="paw-association-filter-empty">
          <h3>No eligible Association for {moodFilter} yet.</h3>
          <p>The top ten currently contain other Dog Moods.</p>
        </div>
      ) : (
        <div className="paw-association-list">
          {associations.map(({ association, rank }) => (
            <PawTrendsActivityAssociationCard
              association={association}
              key={association.stableKey}
              rank={rank}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PawTrendsActivityAssociationCard({
  association,
  rank,
}: {
  association: PawTrendsActivityAssociation;
  rank: number;
}) {
  let DirectionIcon = Minus;
  if (association.direction === "positive") {
    DirectionIcon = ArrowUpRight;
  } else if (association.direction === "negative") {
    DirectionIcon = ArrowDownRight;
  }
  const activityLabel = association.samples[0]?.activityKind ?? "Activity";

  return (
    <article className="paw-association-card">
      <header className="paw-association-card-heading">
        <div className="paw-association-rank" aria-label={`Rank ${rank}`}>
          {String(rank).padStart(2, "0")}
        </div>
        <div>
          <span>{association.timeRelationship}</span>
          <h3>{association.factor}</h3>
          <p>
            paired with <strong>{association.mood}</strong> Activity Mood
          </p>
        </div>
        <div
          className={`paw-association-direction is-${association.direction}`}
        >
          <DirectionIcon aria-hidden="true" />
          <span>{association.direction}</span>
        </div>
      </header>

      <details className="paw-association-details">
        <summary>
          See the {association.samples.length} {activityLabel}
          {association.samples.length === 1 ? "" : "s"} that counted
          <ChevronDown aria-hidden="true" />
        </summary>
        <section
          aria-label={`${association.factor} activities that counted`}
          className="paw-association-sample-list"
          tabIndex={0}
        >
          <ul>
            {association.samples.map((sample) => (
              <li key={sample.activityId}>
                <time dateTime={sample.startedAt}>{sample.localDate}</time>
                <span>{sample.activityMood}</span>
                <span>
                  Factor value{" "}
                  {formatPawTrendsAssociationSampleValue(
                    association,
                    sample.factorValue
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </details>

      <div className="paw-association-strength">
        <div>
          <span>Normalized strength</span>
          <strong>{Math.round(association.strength * 100)}%</strong>
        </div>
        <meter
          className="paw-association-strength-track"
          aria-label={`${Math.round(association.strength * 100)} percent normalized strength`}
          max={100}
          min={0}
          value={Math.round(association.strength * 100)}
        />
        <span>Pearson r = {formatPawTrendsPearsonR(association.pearsonR)}</span>
      </div>

      <p className="paw-association-direction-copy">
        {getPawTrendsAssociationDirectionCopy(association)}
      </p>

      <div className="paw-association-comparison">
        <div>
          <span>{association.comparison.left.label}</span>
          <strong>
            {formatPawTrendsAssociationValue(
              association.comparison.left.value,
              association
            )}
          </strong>
          <small>
            {association.comparison.left.sampleSize} {activityLabel}
            {association.comparison.left.sampleSize === 1 ? "" : "s"}
          </small>
        </div>
        <div className="paw-association-difference">
          <span>Difference</span>
          <strong>{formatPawTrendsAssociationDifference(association)}</strong>
        </div>
        <div>
          <span>{association.comparison.right.label}</span>
          <strong>
            {formatPawTrendsAssociationValue(
              association.comparison.right.value,
              association
            )}
          </strong>
          <small>
            {association.comparison.right.sampleSize} {activityLabel}
            {association.comparison.right.sampleSize === 1 ? "" : "s"}
          </small>
        </div>
      </div>

      <footer>
        <p>
          Ranked by absolute Pearson r, then sample size. Small personal samples
          can surface coincidences.
        </p>
        <strong>Association, not causation.</strong>
      </footer>
    </article>
  );
}
