import { Save } from "lucide-react";
import { useState } from "react";
import type { SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import type {
  PawTrendsDogMood,
  PawTrendsProbeStore,
  PawTrendsReusableLabels,
  PawTrendsSetupRecord,
  PawTrendsTraining,
} from "@/persistence/paw-trends-probe-store";
import {
  getPawTrendsLocalDate,
  PAW_TRENDS_DOG_MOODS,
} from "@/persistence/paw-trends-probe-store";

const formatPawTrendsTrainingTime = (date: Date): string =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

interface PawTrendsTrainingEditorProps {
  initialTraining?: PawTrendsTraining;
  labels: PawTrendsReusableLabels;
  store: PawTrendsProbeStore;
  onCancel: () => void;
  onLabelsChanged: (setup: PawTrendsSetupRecord) => void;
  onSaved: () => Promise<void>;
}

/** Edits Training with only its shared Dog Activity fields. */
export function PawTrendsTrainingEditor({
  initialTraining,
  labels: initialLabels,
  store,
  onCancel,
  onLabelsChanged,
  onSaved,
}: PawTrendsTrainingEditorProps) {
  const initialStart = initialTraining
    ? new Date(initialTraining.startedAt)
    : new Date();
  const [labels, setLabels] = useState(initialLabels);
  const [trainingDate, setTrainingDate] = useState(
    initialTraining?.localDate ?? getPawTrendsLocalDate(initialStart)
  );
  const [trainingTime, setTrainingTime] = useState(
    formatPawTrendsTrainingTime(initialStart)
  );
  const [trainingType, setTrainingType] = useState(
    initialTraining?.trainingType ?? ""
  );
  const [activityMood, setActivityMood] = useState<PawTrendsDogMood | "">(
    initialTraining?.activityMood ?? ""
  );
  const [dogSymptoms, setDogSymptoms] = useState(
    initialTraining?.dogSymptoms ?? []
  );
  const [newTrainingType, setNewTrainingType] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const saveTrainingType = async () => {
    try {
      const setup = await store.saveReusableLabel(
        "Training Type",
        newTrainingType
      );
      const savedLabel = setup.labels["Training Type"].find(
        (label) =>
          label.toLocaleLowerCase() ===
          newTrainingType.trim().toLocaleLowerCase()
      );
      setLabels(setup.labels);
      onLabelsChanged(setup);
      if (savedLabel !== undefined) {
        setTrainingType(savedLabel);
      }
      setNewTrainingType("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Training Type could not be saved."
      );
    }
  };

  const saveTraining = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const start = new Date(`${trainingDate}T${trainingTime}`);
    if (Number.isNaN(start.getTime())) {
      setErrorMessage("Choose a valid Training date and time.");
      return;
    }
    if (!activityMood) {
      setErrorMessage("Confirm the dominant Activity Mood.");
      return;
    }
    try {
      const trainingToSave = {
        activityMood,
        dogSymptoms,
        localDate: trainingDate,
        startedAt: start.toISOString(),
        trainingType,
      };
      await store.saveTraining(
        initialTraining === undefined
          ? trainingToSave
          : { ...trainingToSave, id: initialTraining.id }
      );
      await onSaved();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Training could not be saved."
      );
    }
  };

  return (
    <form
      className="paw-inline-editor paw-training-editor"
      aria-label={initialTraining ? "Edit Training" : "Log Training"}
      onSubmit={(event) => {
        void saveTraining(event);
      }}
    >
      <div className="paw-inline-editor-heading">
        <div>
          <span>
            {initialTraining ? "Revisit activity" : "Completed activity"}
          </span>
          <h2>{initialTraining ? "Edit Training" : "Log Training"}</h2>
        </div>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </div>

      <div className="paw-training-time-grid">
        <label>
          Date
          <input
            required
            type="date"
            value={trainingDate}
            onChange={(event) => {
              setTrainingDate(event.target.value);
            }}
          />
        </label>
        <label>
          Time
          <input
            required
            type="time"
            value={trainingTime}
            onChange={(event) => {
              setTrainingTime(event.target.value);
            }}
          />
        </label>
      </div>

      <label>
        Training Type
        <select
          required
          value={trainingType}
          onChange={(event) => {
            setTrainingType(event.target.value);
          }}
        >
          <option value="">Choose one Training Type</option>
          {labels["Training Type"].map((label) => (
            <option key={label}>{label}</option>
          ))}
        </select>
      </label>
      <div className="paw-inline-label-adder">
        <input
          aria-label="New Training Type label"
          maxLength={80}
          placeholder="Add training type inline"
          value={newTrainingType}
          onChange={(event) => {
            setNewTrainingType(event.target.value);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!newTrainingType.trim()}
          onClick={() => {
            void saveTrainingType();
          }}
        >
          Add
        </Button>
      </div>

      <label>
        Activity Mood
        <select
          required
          value={activityMood}
          onChange={(event) => {
            const mood = PAW_TRENDS_DOG_MOODS.find(
              (option) => option === event.target.value
            );
            setActivityMood(mood ?? "");
          }}
        >
          <option value="">Confirm the dominant mood</option>
          {PAW_TRENDS_DOG_MOODS.map((mood) => (
            <option key={mood}>{mood}</option>
          ))}
        </select>
      </label>

      <fieldset className="paw-symptom-picker paw-training-symptom-picker">
        <legend>Dog Symptoms</legend>
        <p>None selected confirms no Dog Symptoms.</p>
        {labels["Dog Symptom"].map((label) => (
          <label key={label}>
            <input
              type="checkbox"
              checked={dogSymptoms.includes(label)}
              onChange={() => {
                setDogSymptoms((selected) =>
                  selected.includes(label)
                    ? selected.filter((item) => item !== label)
                    : [...selected, label]
                );
              }}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {errorMessage === null ? null : (
        <p className="paw-form-error" role="alert">
          {errorMessage}
        </p>
      )}
      <Button type="submit">
        <Save aria-hidden="true" /> Save Training
      </Button>
    </form>
  );
}
