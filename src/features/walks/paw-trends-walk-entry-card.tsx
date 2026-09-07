import { Footprints, Trash2 } from "lucide-react";

import type {
  PawTrendsProbeStore,
  PawTrendsWalk,
} from "@/persistence/paw-trends-probe-store";
import { calculatePawTrendsWalkReactionSummary } from "@/persistence/paw-trends-probe-store";

/** Shows a saved Walk with separate encounter and severity measures. */
export function PawTrendsWalkEntryCard({
  walk,
  store,
  onDeleted,
  onEdit,
}: {
  walk: PawTrendsWalk;
  store: PawTrendsProbeStore;
  onDeleted: () => Promise<void>;
  onEdit: () => void;
}) {
  const summary = calculatePawTrendsWalkReactionSummary(walk.triggerEncounters);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(walk.startedAt));

  return (
    <article className="paw-entry-card paw-walk-entry-card">
      <span className="paw-entry-subject is-walk" aria-hidden="true">
        <Footprints />
      </span>
      <div>
        <span>Walk · {time}</span>
        <h3>{walk.place}</h3>
        <p>
          {walk.durationMinutes} min · {walk.activityMood}
        </p>
        <dl className="paw-walk-summary">
          <div>
            <dt>Encounters</dt>
            <dd>{summary.totalEncounters}</dd>
          </div>
          <div>
            <dt>Reactive</dt>
            <dd>{summary.reactiveEncounters}</dd>
          </div>
          <div>
            <dt>Average</dt>
            <dd>{summary.averageSeverity.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Peak</dt>
            <dd>{summary.peakSeverity}</dd>
          </div>
        </dl>
      </div>
      <div className="paw-entry-actions">
        <button type="button" onClick={onEdit}>
          Edit
        </button>
        <button
          type="button"
          aria-label={`Delete Walk at ${time}`}
          onClick={() => {
            const deleteWalk = async () => {
              await store.deleteWalk(walk.id);
              await onDeleted();
            };
            void deleteWalk();
          }}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
