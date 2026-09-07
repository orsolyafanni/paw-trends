import { Dumbbell, Trash2 } from "lucide-react";

import type {
  PawTrendsProbeStore,
  PawTrendsTraining,
} from "@/persistence/paw-trends-probe-store";

/** Shows a saved Training without Walk-only details. */
export function PawTrendsTrainingEntryCard({
  training,
  store,
  onDeleted,
  onEdit,
}: {
  training: PawTrendsTraining;
  store: PawTrendsProbeStore;
  onDeleted: () => Promise<void>;
  onEdit: () => void;
}) {
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(training.startedAt));

  return (
    <article className="paw-entry-card paw-training-entry-card">
      <span className="paw-entry-subject is-training" aria-hidden="true">
        <Dumbbell />
      </span>
      <div>
        <span>Training · {time}</span>
        <h3>{training.trainingType}</h3>
        <p>{training.activityMood}</p>
        <p>
          {training.dogSymptoms.length === 0
            ? "No Dog Symptoms"
            : training.dogSymptoms.join(", ")}
        </p>
      </div>
      <div className="paw-entry-actions">
        <button type="button" onClick={onEdit}>
          Edit
        </button>
        <button
          type="button"
          aria-label={`Delete Training at ${time}`}
          onClick={() => {
            const deleteTraining = async () => {
              await store.deleteTraining(training.id);
              await onDeleted();
            };
            void deleteTraining();
          }}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
