/* oxlint-disable no-use-before-define -- The editor reads from its main flow to small field components. */

import { Plus, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import type { SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import type {
  PawTrendsDogMood,
  PawTrendsProbeStore,
  PawTrendsReactionSeverity,
  PawTrendsReusableLabelCategory,
  PawTrendsReusableLabels,
  PawTrendsSetupRecord,
  PawTrendsTriggerEncounter,
  PawTrendsWalk,
} from "@/persistence/paw-trends-probe-store";
import {
  getPawTrendsLocalDate,
  PAW_TRENDS_DOG_MOODS,
} from "@/persistence/paw-trends-probe-store";

const REACTION_SEVERITY_GUIDE = [
  "Noticed, no reaction",
  "Mild attention, easy disengagement",
  "Sustained attention, still responds",
  "Mild reaction",
  "Intense reaction, no ready disengagement",
  "Extreme reaction or safety concern",
] as const;

const PAW_TRENDS_REACTION_SEVERITIES = [0, 1, 2, 3, 4, 5] as const;

const formatPawTrendsLocalTime = (date: Date): string =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const togglePawTrendsSelectedLabel = (
  label: string,
  selected: string[],
  setSelected: (next: string[]) => void
) => {
  setSelected(
    selected.includes(label)
      ? selected.filter((item) => item !== label)
      : [...selected, label]
  );
};

const readPawTrendsDogMood = (value: string): PawTrendsDogMood | "" =>
  PAW_TRENDS_DOG_MOODS.find((mood) => mood === value) ?? "";

const readPawTrendsReactionSeverity = (
  value: string
): PawTrendsReactionSeverity =>
  PAW_TRENDS_REACTION_SEVERITIES.find(
    (severity) => severity === Number(value)
  ) ?? 0;

interface PawTrendsWalkEditorProps {
  initialWalk?: PawTrendsWalk;
  labels: PawTrendsReusableLabels;
  recentTriggers: string[];
  store: PawTrendsProbeStore;
  onCancel: () => void;
  onLabelsChanged: (setup: PawTrendsSetupRecord) => void;
  onSaved: () => Promise<void>;
}

/** Edits one complete Walk and its separate Trigger Encounters. */
// oxlint-disable-next-line eslint/complexity -- Conditional sections mirror the Walk's optional context.
export function PawTrendsWalkEditor({
  initialWalk,
  labels: initialLabels,
  recentTriggers,
  store,
  onCancel,
  onLabelsChanged,
  onSaved,
}: PawTrendsWalkEditorProps) {
  const initialStart = initialWalk
    ? new Date(initialWalk.startedAt)
    : new Date();
  const [labels, setLabels] = useState(initialLabels);
  const [walkDate, setWalkDate] = useState(
    initialWalk?.localDate ?? getPawTrendsLocalDate(initialStart)
  );
  const [walkTime, setWalkTime] = useState(
    formatPawTrendsLocalTime(initialStart)
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initialWalk ? String(initialWalk.durationMinutes) : ""
  );
  const [place, setPlace] = useState(initialWalk?.place ?? "");
  const [activityMood, setActivityMood] = useState<PawTrendsDogMood | "">(
    initialWalk?.activityMood ?? ""
  );
  const [company, setCompany] = useState(initialWalk?.company ?? []);
  const [dogSymptoms, setDogSymptoms] = useState(
    initialWalk?.dogSymptoms ?? []
  );
  const [encounters, setEncounters] = useState<PawTrendsTriggerEncounter[]>(
    initialWalk?.triggerEncounters ?? []
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const addEncounter = (trigger = "") => {
    setEncounters((current) => [
      ...current,
      { id: crypto.randomUUID(), reactionSeverity: 0, trigger },
    ]);
  };

  const addReusableLabel = async (
    category: PawTrendsReusableLabelCategory,
    label: string
  ) => {
    try {
      const setup = await store.saveReusableLabel(category, label);
      setLabels(setup.labels);
      onLabelsChanged(setup);
      return true;
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The label could not be saved."
      );
      return false;
    }
  };

  const saveWalk = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const start = new Date(`${walkDate}T${walkTime}`);
    const parsedDuration = Number(durationMinutes);
    if (Number.isNaN(start.getTime())) {
      setErrorMessage("Choose a valid Walk date and time.");
      return;
    }
    if (!activityMood) {
      setErrorMessage("Confirm the dominant Activity Mood.");
      return;
    }
    try {
      const walkToSave = {
        activityMood,
        company,
        dogSymptoms,
        durationMinutes: parsedDuration,
        localDate: walkDate,
        place,
        startedAt: start.toISOString(),
        triggerEncounters: encounters,
      };
      await store.saveWalk(
        initialWalk === undefined
          ? walkToSave
          : { ...walkToSave, id: initialWalk.id }
      );
      await onSaved();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The Walk could not be saved."
      );
    }
  };

  const encounterTrigger = encounters.at(-1)?.trigger;
  const lastTrigger =
    encounterTrigger !== undefined && encounterTrigger !== ""
      ? encounterTrigger
      : recentTriggers[0];

  return (
    <form
      className="paw-inline-editor paw-walk-editor"
      aria-label={initialWalk ? "Edit Walk" : "Log Walk"}
      onSubmit={(event) => {
        void saveWalk(event);
      }}
    >
      <div className="paw-inline-editor-heading">
        <div>
          <span>{initialWalk ? "Revisit activity" : "Completed activity"}</span>
          <h2>{initialWalk ? "Edit Walk" : "Log a Walk"}</h2>
        </div>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </div>

      <div className="paw-walk-time-grid">
        <label>
          Date
          <input
            required
            type="date"
            value={walkDate}
            onChange={(event) => {
              setWalkDate(event.target.value);
            }}
          />
        </label>
        <label>
          Time
          <input
            required
            type="time"
            value={walkTime}
            onChange={(event) => {
              setWalkTime(event.target.value);
            }}
          />
        </label>
        <label>
          Duration in minutes
          <input
            min="1"
            required
            step="1"
            type="number"
            value={durationMinutes}
            onChange={(event) => {
              setDurationMinutes(event.target.value);
            }}
          />
        </label>
      </div>

      <label>
        Place
        <select
          required
          value={place}
          onChange={(event) => {
            setPlace(event.target.value);
          }}
        >
          <option value="">Choose one Place</option>
          {labels.Place.map((label) => (
            <option key={label}>{label}</option>
          ))}
        </select>
      </label>
      <PawTrendsInlineLabelAdder category="Place" onAdd={addReusableLabel} />

      <label>
        Activity Mood
        <select
          required
          value={activityMood}
          onChange={(event) => {
            setActivityMood(readPawTrendsDogMood(event.target.value));
          }}
        >
          <option value="">Confirm the dominant mood</option>
          {PAW_TRENDS_DOG_MOODS.map((mood) => (
            <option key={mood}>{mood}</option>
          ))}
        </select>
      </label>

      <PawTrendsWalkLabelPicker
        emptyCopy="None selected means no Company."
        labels={labels.Company}
        legend="Company"
        selected={company}
        onToggle={(label) => {
          togglePawTrendsSelectedLabel(label, company, setCompany);
        }}
      />
      <PawTrendsInlineLabelAdder category="Company" onAdd={addReusableLabel} />

      <PawTrendsWalkLabelPicker
        emptyCopy="None selected confirms no Dog Symptoms."
        labels={labels["Dog Symptom"]}
        legend="Dog Symptoms"
        selected={dogSymptoms}
        onToggle={(label) => {
          togglePawTrendsSelectedLabel(label, dogSymptoms, setDogSymptoms);
        }}
      />
      <PawTrendsInlineLabelAdder
        category="Dog Symptom"
        onAdd={addReusableLabel}
      />

      <section
        className="paw-encounter-editor"
        aria-labelledby="encounters-heading"
      >
        <div className="paw-encounter-heading">
          <div>
            <h3 id="encounters-heading">Trigger Encounters</h3>
            <p>No encounters means none occurred.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              addEncounter();
            }}
          >
            <Plus aria-hidden="true" /> Add encounter
          </Button>
        </div>

        {recentTriggers.length > 0 ? (
          <div
            className="paw-trigger-shortcuts"
            aria-label="Recent Trigger shortcuts"
          >
            <span>Recent</span>
            {recentTriggers.map((trigger) => (
              <button
                type="button"
                key={trigger}
                onClick={() => {
                  addEncounter(trigger);
                }}
              >
                {trigger}
              </button>
            ))}
          </div>
        ) : null}
        {lastTrigger !== undefined && lastTrigger !== "" ? (
          <button
            className="paw-repeat-trigger"
            type="button"
            onClick={() => {
              addEncounter(lastTrigger);
            }}
          >
            Repeat last Trigger: {lastTrigger}
          </button>
        ) : null}

        <div className="paw-encounter-list">
          {encounters.map((encounter, index) => (
            <fieldset className="paw-encounter-row" key={encounter.id}>
              <legend>Encounter {index + 1}</legend>
              <label>
                Trigger
                <select
                  required
                  value={encounter.trigger}
                  onChange={(event) => {
                    setEncounters((current) =>
                      current.map((item) =>
                        item.id === encounter.id
                          ? { ...item, trigger: event.target.value }
                          : item
                      )
                    );
                  }}
                >
                  <option value="">Choose a Trigger</option>
                  {labels.Trigger.map((label) => (
                    <option key={label}>{label}</option>
                  ))}
                </select>
              </label>
              <label>
                Reaction Severity
                <select
                  value={encounter.reactionSeverity}
                  onChange={(event) => {
                    const reactionSeverity = readPawTrendsReactionSeverity(
                      event.target.value
                    );
                    setEncounters((current) =>
                      current.map((item) =>
                        item.id === encounter.id
                          ? { ...item, reactionSeverity }
                          : item
                      )
                    );
                  }}
                >
                  {REACTION_SEVERITY_GUIDE.map((description, severity) => (
                    <option key={description} value={severity}>
                      {severity} · {description}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-label={`Remove encounter ${index + 1}`}
                onClick={() => {
                  setEncounters((current) =>
                    current.filter((item) => item.id !== encounter.id)
                  );
                }}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </fieldset>
          ))}
        </div>
        <PawTrendsInlineLabelAdder
          category="Trigger"
          onAdd={addReusableLabel}
        />
      </section>

      {errorMessage === null ? null : (
        <p className="paw-form-error" role="alert">
          {errorMessage}
        </p>
      )}
      <Button type="submit">
        <Save aria-hidden="true" /> Save Walk
      </Button>
    </form>
  );
}

function PawTrendsWalkLabelPicker({
  emptyCopy,
  labels,
  legend,
  selected,
  onToggle,
}: {
  emptyCopy: string;
  labels: string[];
  legend: string;
  selected: string[];
  onToggle: (label: string) => void;
}) {
  return (
    <fieldset className="paw-symptom-picker paw-walk-label-picker">
      <legend>{legend}</legend>
      <p>{emptyCopy}</p>
      {labels.map((label) => (
        <label key={label}>
          <input
            type="checkbox"
            checked={selected.includes(label)}
            onChange={() => {
              onToggle(label);
            }}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

function PawTrendsInlineLabelAdder({
  category,
  onAdd,
}: {
  category: PawTrendsReusableLabelCategory;
  onAdd: (
    category: PawTrendsReusableLabelCategory,
    label: string
  ) => Promise<boolean>;
}) {
  const [label, setLabel] = useState("");
  return (
    <div className="paw-inline-label-adder">
      <input
        aria-label={`New ${category} label`}
        maxLength={80}
        placeholder={`Add ${category.toLocaleLowerCase()} inline`}
        value={label}
        onChange={(event) => {
          setLabel(event.target.value);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={!label.trim()}
        onClick={() => {
          const saveLabel = async () => {
            if (await onAdd(category, label)) {
              setLabel("");
            }
          };
          void saveLabel();
        }}
      >
        Add
      </Button>
    </div>
  );
}
