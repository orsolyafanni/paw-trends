import {
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Footprints,
  ListChecks,
  PawPrint,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
  PawTrendsHistoryRecord,
  PawTrendsProbeStore,
} from "@/persistence/paw-trends-probe-store";
import { PAW_TRENDS_DOG_MOODS } from "@/persistence/paw-trends-probe-store";

import { calculatePawTrendsPatternReadiness } from "./paw-trends-pattern-readiness-model";

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
        <p>See what you have recorded and when comparisons can begin.</p>
      </header>

      {loadFailed ? (
        <section className="paw-patterns-error" role="alert">
          <h2>Patterns could not read your observations.</h2>
          <p>Return to Patterns to try loading these counts again.</p>
        </section>
      ) : null}

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
