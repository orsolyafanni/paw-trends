/* oxlint-disable no-use-before-define -- The History screen reads from its main flow to focused entry components. */

import {
  CalendarRange,
  ChevronDown,
  CircleUserRound,
  Clock3,
  Dumbbell,
  Footprints,
  ListChecks,
  PawPrint,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import { PawTrendsTrainingEditor } from "@/features/training/paw-trends-training-editor";
import { PawTrendsWalkEditor } from "@/features/walks/paw-trends-walk-editor";
import type {
  PawTrendsDailyCheckIn,
  PawTrendsHistoryRecord,
  PawTrendsMoodEntry,
  PawTrendsProbeStore,
  PawTrendsSetupRecord,
  PawTrendsTraining,
  PawTrendsWalk,
} from "@/persistence/paw-trends-probe-store";
import {
  getPawTrendsLocalDate,
  getPawTrendsMoodIntervalEnd,
  PAW_TRENDS_DOG_MOODS,
  PAW_TRENDS_OWNER_MOODS,
} from "@/persistence/paw-trends-probe-store";

import {
  filterPawTrendsHistoryRecords,
  getPawTrendsHistoryRecordTimestamp,
  groupPawTrendsHistoryRecordsByDay,
  isPawTrendsHistoryUndoAvailable,
  PAW_TRENDS_HISTORY_ENTRY_TYPES,
} from "./paw-trends-history-model";
import type { PawTrendsHistoryEntryType } from "./paw-trends-history-model";

const PAW_TRENDS_HISTORY_UNDO_MILLISECONDS = 6000;

const getPawTrendsHistoryUndoDeadline = (): number =>
  Date.now() + PAW_TRENDS_HISTORY_UNDO_MILLISECONDS;

type PawTrendsHistoryEditor =
  | { entry: PawTrendsMoodEntry; kind: "mood" }
  | { entry: PawTrendsDailyCheckIn; kind: "check-in" }
  | { entry: PawTrendsTraining; kind: "training" }
  | { entry: PawTrendsWalk; kind: "walk" }
  | null;

interface PawTrendsPendingHistoryUndo {
  deadlineMilliseconds: number;
  entry: PawTrendsHistoryRecord;
}

const formatPawTrendsHistoryDate = (localDate: string): string => {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};

const formatPawTrendsHistoryTime = (timestamp: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));

const formatPawTrendsDateTimeLocalValue = (date: Date): string => {
  const offsetMilliseconds = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMilliseconds)
    .toISOString()
    .slice(0, 16);
};

const getPawTrendsHistoryRecordKey = (entry: PawTrendsHistoryRecord): string =>
  entry.kind === "check-in"
    ? `check-in:${entry.record.localDate}`
    : `${entry.kind}:${entry.record.id}`;

const getPawTrendsHistoryRecordLabel = (
  entry: PawTrendsHistoryRecord
): string => {
  if (entry.kind === "check-in") {
    return "Daily Check-in";
  }
  if (entry.kind === "mood") {
    return entry.record.subject === "dog" ? "Dog Mood" : "Owner Mood";
  }
  return entry.kind === "walk" ? "Walk" : "Training";
};

/** Displays every supported observation in a filterable, editable day timeline. */
export function PawTrendsHistory({
  setupRecord,
  store,
}: {
  setupRecord: PawTrendsSetupRecord;
  store: PawTrendsProbeStore;
}) {
  const [records, setRecords] = useState<PawTrendsHistoryRecord[]>([]);
  const [currentSetup, setCurrentSetup] = useState(setupRecord);
  const [recentTriggers, setRecentTriggers] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [entryType, setEntryType] = useState<PawTrendsHistoryEntryType>("all");
  const [expandedEntryKey, setExpandedEntryKey] = useState<string | null>(null);
  const [editor, setEditor] = useState<PawTrendsHistoryEditor>(null);
  const [pendingUndo, setPendingUndo] =
    useState<PawTrendsPendingHistoryUndo | null>(null);
  const undoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadHistory = async () => {
    const [savedRecords, savedRecentTriggers] = await Promise.all([
      store.listHistoryRecords(),
      store.listRecentTriggerLabels(3),
    ]);
    setRecords(savedRecords);
    setRecentTriggers(savedRecentTriggers);
  };

  useEffect(() => {
    let isCurrent = true;
    const loadInitialHistory = async () => {
      const [savedRecords, savedRecentTriggers] = await Promise.all([
        store.listHistoryRecords(),
        store.listRecentTriggerLabels(3),
      ]);
      if (isCurrent) {
        setRecords(savedRecords);
        setRecentTriggers(savedRecentTriggers);
      }
    };
    void loadInitialHistory();
    return () => {
      isCurrent = false;
      if (undoTimeout.current !== null) {
        clearTimeout(undoTimeout.current);
      }
    };
  }, [store]);

  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);
  const dayGroups = useMemo(() => {
    if (dateRangeInvalid) {
      return [];
    }
    return groupPawTrendsHistoryRecordsByDay(
      filterPawTrendsHistoryRecords(records, {
        fromDate,
        toDate,
        type: entryType,
      })
    );
  }, [dateRangeInvalid, entryType, fromDate, records, toDate]);
  const visibleEntryCount = dayGroups.reduce(
    (count, group) => count + group.records.length,
    0
  );
  const moodEntries = records
    .filter(
      (entry): entry is Extract<PawTrendsHistoryRecord, { kind: "mood" }> =>
        entry.kind === "mood"
    )
    .map((entry) => entry.record);

  const deleteHistoryEntry = async (entry: PawTrendsHistoryRecord) => {
    if (undoTimeout.current !== null) {
      clearTimeout(undoTimeout.current);
    }
    await store.deleteHistoryRecord(entry);
    const deadlineMilliseconds = getPawTrendsHistoryUndoDeadline();
    setPendingUndo({ deadlineMilliseconds, entry });
    setEditor(null);
    setExpandedEntryKey(null);
    await loadHistory();
    undoTimeout.current = setTimeout(() => {
      setPendingUndo(null);
      undoTimeout.current = null;
    }, PAW_TRENDS_HISTORY_UNDO_MILLISECONDS);
  };

  const undoHistoryDeletion = async () => {
    if (
      pendingUndo === null ||
      !isPawTrendsHistoryUndoAvailable(
        pendingUndo.deadlineMilliseconds,
        Date.now()
      )
    ) {
      setPendingUndo(null);
      return;
    }
    if (undoTimeout.current !== null) {
      clearTimeout(undoTimeout.current);
      undoTimeout.current = null;
    }
    await store.restoreHistoryRecord(pendingUndo.entry);
    setPendingUndo(null);
    await loadHistory();
  };

  const closeEditorAfterSave = async () => {
    await loadHistory();
    setEditor(null);
  };

  const editHistoryEntry = (entry: PawTrendsHistoryRecord) => {
    if (entry.kind === "check-in") {
      setEditor({ entry: entry.record, kind: "check-in" });
    } else if (entry.kind === "mood") {
      setEditor({ entry: entry.record, kind: "mood" });
    } else if (entry.kind === "training") {
      setEditor({ entry: entry.record, kind: "training" });
    } else {
      setEditor({ entry: entry.record, kind: "walk" });
    }
  };

  let historyContent;
  if (records.length === 0) {
    historyContent = (
      <section className="paw-secondary-empty paw-history-empty">
        <Clock3 aria-hidden="true" />
        <h2>Your history starts with the first entry.</h2>
        <p>
          Walks, Training, moods, and Daily Check-ins will collect here by day.
        </p>
      </section>
    );
  } else if (dayGroups.length === 0) {
    historyContent = (
      <section className="paw-history-no-results">
        <h2>No entries match these filters.</h2>
        <p>Change the dates or entry type to see more of your history.</p>
      </section>
    );
  } else {
    historyContent = (
      <div className="paw-history-day-list">
        {dayGroups.map((group) => (
          <section className="paw-history-day" key={group.localDate}>
            <div className="paw-history-day-heading">
              <h2>{formatPawTrendsHistoryDate(group.localDate)}</h2>
              <span>{group.records.length}</span>
            </div>
            <div className="paw-entry-list">
              {group.records.map((entry) => {
                const entryKey = getPawTrendsHistoryRecordKey(entry);
                return (
                  <PawTrendsHistoryEntry
                    entry={entry}
                    expanded={expandedEntryKey === entryKey}
                    key={entryKey}
                    moodEntries={moodEntries}
                    onDelete={() => {
                      void deleteHistoryEntry(entry);
                    }}
                    onEdit={() => {
                      editHistoryEntry(entry);
                    }}
                    onToggle={() => {
                      setExpandedEntryKey((current) =>
                        current === entryKey ? null : entryKey
                      );
                    }}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <main className="paw-app-content paw-secondary-screen paw-history-screen">
      <header>
        <div className="paw-brand-lockup paw-brand-lockup-compact">
          <span className="paw-brand-mark" aria-hidden="true">
            <PawPrint />
          </span>
          <span>Paw Trends</span>
        </div>
        <h1>History</h1>
        <p>
          Review and correct every observation, grouped by the day it happened.
        </p>
      </header>

      <section
        className="paw-history-filter-panel"
        aria-label="History filters"
      >
        <div className="paw-history-filter-heading">
          <CalendarRange aria-hidden="true" />
          <div>
            <h2>Show entries</h2>
            <p>{visibleEntryCount} in this view</p>
          </div>
        </div>
        <div className="paw-history-filter-grid">
          <label>
            From
            <input
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
              }}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
              }}
            />
          </label>
          <label>
            Entry type
            <select
              value={entryType}
              onChange={(event) => {
                const selectedType = PAW_TRENDS_HISTORY_ENTRY_TYPES.find(
                  (type) => type === event.target.value
                );
                if (selectedType !== undefined) {
                  setEntryType(selectedType);
                }
              }}
            >
              <option value="all">All entries</option>
              <option value="walk">Walks</option>
              <option value="training">Training</option>
              <option value="dog-mood">Dog Mood</option>
              <option value="owner-mood">Owner Mood</option>
              <option value="check-in">Daily Check-ins</option>
            </select>
          </label>
        </div>
        {dateRangeInvalid ? (
          <p className="paw-form-error" role="alert">
            The From date must be on or before the To date.
          </p>
        ) : null}
      </section>

      {editor?.kind === "walk" ? (
        <PawTrendsWalkEditor
          initialWalk={editor.entry}
          labels={currentSetup.labels}
          recentTriggers={recentTriggers}
          store={store}
          onCancel={() => {
            setEditor(null);
          }}
          onLabelsChanged={setCurrentSetup}
          onSaved={closeEditorAfterSave}
        />
      ) : null}
      {editor?.kind === "training" ? (
        <PawTrendsTrainingEditor
          initialTraining={editor.entry}
          labels={currentSetup.labels}
          store={store}
          onCancel={() => {
            setEditor(null);
          }}
          onLabelsChanged={setCurrentSetup}
          onSaved={closeEditorAfterSave}
        />
      ) : null}
      {editor?.kind === "mood" ? (
        <PawTrendsHistoryMoodEditor
          entry={editor.entry}
          store={store}
          onCancel={() => {
            setEditor(null);
          }}
          onSaved={closeEditorAfterSave}
        />
      ) : null}
      {editor?.kind === "check-in" ? (
        <PawTrendsHistoryCheckInEditor
          entry={editor.entry}
          ownerSymptoms={currentSetup.labels["Owner Symptom"]}
          store={store}
          onCancel={() => {
            setEditor(null);
          }}
          onSaved={closeEditorAfterSave}
        />
      ) : null}

      {historyContent}

      {pendingUndo === null ? null : (
        <output className="paw-history-undo">
          <span>
            {getPawTrendsHistoryRecordLabel(pendingUndo.entry)} deleted
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              void undoHistoryDeletion();
            }}
          >
            <RotateCcw aria-hidden="true" />
            Undo
          </Button>
        </output>
      )}
    </main>
  );
}

function PawTrendsHistoryEntry({
  entry,
  expanded,
  moodEntries,
  onDelete,
  onEdit,
  onToggle,
}: {
  entry: PawTrendsHistoryRecord;
  expanded: boolean;
  moodEntries: PawTrendsMoodEntry[];
  onDelete: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  const label = getPawTrendsHistoryRecordLabel(entry);
  const time = formatPawTrendsHistoryTime(
    getPawTrendsHistoryRecordTimestamp(entry)
  );
  let title = label;
  let summary = time;
  let Icon = ListChecks;
  if (entry.kind === "walk") {
    title = entry.record.place;
    summary = `${entry.record.durationMinutes} min · ${entry.record.activityMood}`;
    Icon = Footprints;
  } else if (entry.kind === "training") {
    title = entry.record.trainingType;
    summary = entry.record.activityMood;
    Icon = Dumbbell;
  } else if (entry.kind === "mood") {
    title = entry.record.mood;
    summary = time;
    Icon = entry.record.subject === "dog" ? PawPrint : CircleUserRound;
  } else {
    summary =
      entry.record.ownerSymptoms.length === 0
        ? "Symptom-free"
        : entry.record.ownerSymptoms.join(", ");
  }

  return (
    <article className="paw-entry-card paw-history-entry-card">
      <span className={`paw-entry-subject is-${entry.kind}`} aria-hidden="true">
        <Icon />
      </span>
      <button
        className="paw-history-entry-toggle"
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span>
          {label}
          {entry.kind === "check-in" ? "" : ` · ${time}`}
        </span>
        <strong>{title}</strong>
        <small>{summary}</small>
        <ChevronDown aria-hidden="true" />
      </button>
      <div className="paw-entry-actions">
        <button type="button" onClick={onEdit}>
          Edit
        </button>
        <button
          type="button"
          aria-label={`Delete ${label} at ${time}`}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
      {expanded ? (
        <PawTrendsHistoryEntryDetails entry={entry} moodEntries={moodEntries} />
      ) : null}
    </article>
  );
}

function PawTrendsHistoryEntryDetails({
  entry,
  moodEntries,
}: {
  entry: PawTrendsHistoryRecord;
  moodEntries: PawTrendsMoodEntry[];
}) {
  if (entry.kind === "walk") {
    return (
      <dl className="paw-history-details">
        <PawTrendsHistoryDetail
          label="Started"
          value={formatPawTrendsHistoryTime(entry.record.startedAt)}
        />
        <PawTrendsHistoryDetail
          label="Duration"
          value={`${entry.record.durationMinutes} minutes`}
        />
        <PawTrendsHistoryDetail label="Place" value={entry.record.place} />
        <PawTrendsHistoryDetail
          label="Activity Mood"
          value={entry.record.activityMood}
        />
        <PawTrendsHistoryDetail
          label="Company"
          value={entry.record.company.join(", ") || "None"}
        />
        <PawTrendsHistoryDetail
          label="Dog Symptoms"
          value={entry.record.dogSymptoms.join(", ") || "None noticed"}
        />
        <div className="paw-history-detail-wide">
          <dt>Trigger Encounters</dt>
          <dd>
            {entry.record.triggerEncounters.length === 0
              ? "None"
              : entry.record.triggerEncounters
                  .map(
                    (encounter) =>
                      `${encounter.trigger}, severity ${encounter.reactionSeverity}`
                  )
                  .join("; ")}
          </dd>
        </div>
      </dl>
    );
  }
  if (entry.kind === "training") {
    return (
      <dl className="paw-history-details">
        <PawTrendsHistoryDetail
          label="Started"
          value={formatPawTrendsHistoryTime(entry.record.startedAt)}
        />
        <PawTrendsHistoryDetail
          label="Training Type"
          value={entry.record.trainingType}
        />
        <PawTrendsHistoryDetail
          label="Activity Mood"
          value={entry.record.activityMood}
        />
        <PawTrendsHistoryDetail
          label="Dog Symptoms"
          value={entry.record.dogSymptoms.join(", ") || "None noticed"}
        />
      </dl>
    );
  }
  if (entry.kind === "mood") {
    const intervalEnd = getPawTrendsMoodIntervalEnd(entry.record, moodEntries);
    const { notes } = entry.record;
    return (
      <dl className="paw-history-details">
        <PawTrendsHistoryDetail label="Mood" value={entry.record.mood} />
        <PawTrendsHistoryDetail
          label="From"
          value={formatPawTrendsHistoryTime(entry.record.recordedAt)}
        />
        <PawTrendsHistoryDetail
          label="Until"
          value={formatPawTrendsHistoryTime(intervalEnd)}
        />
        {entry.record.subject === "owner" ? (
          <PawTrendsHistoryDetail
            label="Notes"
            value={
              notes !== undefined && notes.trim().length > 0 ? notes : "None"
            }
          />
        ) : null}
      </dl>
    );
  }
  return (
    <dl className="paw-history-details">
      <PawTrendsHistoryDetail
        label="Date"
        value={formatPawTrendsHistoryDate(entry.record.localDate)}
      />
      <PawTrendsHistoryDetail
        label="Owner Symptoms"
        value={entry.record.ownerSymptoms.join(", ") || "None present"}
      />
      <PawTrendsHistoryDetail
        label="Completed"
        value={formatPawTrendsHistoryTime(entry.record.completedAt)}
      />
      <PawTrendsHistoryDetail
        label="Last updated"
        value={formatPawTrendsHistoryTime(entry.record.updatedAt)}
      />
    </dl>
  );
}

function PawTrendsHistoryDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function PawTrendsHistoryMoodEditor({
  entry,
  onCancel,
  onSaved,
  store,
}: {
  entry: PawTrendsMoodEntry;
  onCancel: () => void;
  onSaved: () => Promise<void>;
  store: PawTrendsProbeStore;
}) {
  const moods =
    entry.subject === "dog" ? PAW_TRENDS_DOG_MOODS : PAW_TRENDS_OWNER_MOODS;
  const [mood, setMood] = useState(entry.mood);
  const [recordedAt, setRecordedAt] = useState(
    formatPawTrendsDateTimeLocalValue(new Date(entry.recordedAt))
  );
  const [notes, setNotes] = useState(entry.notes ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const subjectLabel = entry.subject === "dog" ? "Dog Mood" : "Owner Mood";

  const saveMood = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedDate = new Date(recordedAt);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      formatPawTrendsDateTimeLocalValue(parsedDate) !== recordedAt
    ) {
      setErrorMessage("Choose a valid local date and time.");
      return;
    }
    try {
      await store.saveMoodEntry({
        id: entry.id,
        localDate: getPawTrendsLocalDate(parsedDate),
        mood,
        notes:
          entry.subject === "owner" && notes.trim() ? notes.trim() : undefined,
        recordedAt: parsedDate.toISOString(),
        subject: entry.subject,
      });
      await onSaved();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The mood could not be saved."
      );
    }
  };

  return (
    <form
      className="paw-inline-editor"
      aria-label={`Edit ${subjectLabel}`}
      onSubmit={(event) => {
        void saveMood(event);
      }}
    >
      <div className="paw-inline-editor-heading">
        <div>
          <span>Edit observation</span>
          <h2>{subjectLabel}</h2>
        </div>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </div>
      <label>
        Mood
        <select
          value={mood}
          onChange={(event) => {
            const selectedMood = moods.find(
              (option) => option === event.target.value
            );
            if (selectedMood !== undefined) {
              setMood(selectedMood);
            }
          }}
        >
          {moods.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        When
        <input
          required
          type="datetime-local"
          max={formatPawTrendsDateTimeLocalValue(new Date())}
          value={recordedAt}
          onChange={(event) => {
            setRecordedAt(event.target.value);
          }}
        />
      </label>
      {entry.subject === "owner" ? (
        <label>
          Notes <span>optional</span>
          <textarea
            maxLength={500}
            rows={3}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
            }}
          />
        </label>
      ) : null}
      {errorMessage === null ? null : (
        <p className="paw-form-error" role="alert">
          {errorMessage}
        </p>
      )}
      <Button type="submit">
        <Save aria-hidden="true" />
        Save mood
      </Button>
    </form>
  );
}

function PawTrendsHistoryCheckInEditor({
  entry,
  onCancel,
  onSaved,
  ownerSymptoms,
  store,
}: {
  entry: PawTrendsDailyCheckIn;
  onCancel: () => void;
  onSaved: () => Promise<void>;
  ownerSymptoms: string[];
  store: PawTrendsProbeStore;
}) {
  const [localDate, setLocalDate] = useState(entry.localDate);
  const [selectedSymptoms, setSelectedSymptoms] = useState(entry.ownerSymptoms);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom]
    );
  };

  const saveCheckIn = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await store.moveDailyCheckIn(
        entry.localDate,
        localDate,
        selectedSymptoms
      );
      await onSaved();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The Daily Check-in could not be saved."
      );
    }
  };

  return (
    <form
      className="paw-inline-editor"
      aria-label="Edit Daily Check-in"
      onSubmit={(event) => {
        void saveCheckIn(event);
      }}
    >
      <div className="paw-inline-editor-heading">
        <div>
          <span>Edit observation</span>
          <h2>Daily Check-in</h2>
        </div>
        <button type="button" onClick={onCancel}>
          Close
        </button>
      </div>
      <label>
        Date
        <input
          required
          type="date"
          value={localDate}
          onChange={(event) => {
            setLocalDate(event.target.value);
          }}
        />
      </label>
      <fieldset className="paw-symptom-picker">
        <legend>Owner Symptoms</legend>
        {ownerSymptoms.length === 0 ? (
          <p>
            No Owner Symptom labels are configured. Saving confirms
            symptom-free.
          </p>
        ) : (
          ownerSymptoms.map((symptom) => (
            <label key={symptom}>
              <input
                type="checkbox"
                checked={selectedSymptoms.includes(symptom)}
                onChange={() => {
                  toggleSymptom(symptom);
                }}
              />
              {symptom}
            </label>
          ))
        )}
      </fieldset>
      {errorMessage === null ? null : (
        <p className="paw-form-error" role="alert">
          {errorMessage}
        </p>
      )}
      <Button type="submit">
        <Save aria-hidden="true" />
        Save check-in
      </Button>
    </form>
  );
}
