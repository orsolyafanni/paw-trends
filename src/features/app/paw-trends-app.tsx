/* oxlint-disable no-use-before-define -- The file reads from app shell to leaf components. */

import type { Activity } from "lucide-react";
import {
  ChevronRight,
  CircleUserRound,
  Clock3,
  HeartPulse,
  History,
  Home,
  ListChecks,
  PawPrint,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";
import { useEffect, useId, useState } from "react";
import type { SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import type {
  PawTrendsDailyCheckIn,
  PawTrendsDogActivity,
  PawTrendsMoodEntry,
  PawTrendsMoodSubject,
  PawTrendsProbeStore,
  PawTrendsReusableLabelCategory,
  PawTrendsReusableLabels,
  PawTrendsSetupRecord,
  PawTrendsTraining,
  PawTrendsWalk,
} from "@/persistence/paw-trends-probe-store";
import {
  getPawTrendsLocalDate,
  getPawTrendsMoodIntervalEnd,
  PAW_TRENDS_DOG_MOODS,
  PAW_TRENDS_OWNER_MOODS,
  PAW_TRENDS_REUSABLE_LABEL_CATEGORIES,
  PAW_TRENDS_SEEDED_REUSABLE_LABELS,
} from "@/persistence/paw-trends-probe-store";
import { PawTrendsWalkEditor } from "@/features/walks/paw-trends-walk-editor";
import { PawTrendsWalkEntryCard } from "@/features/walks/paw-trends-walk-entry-card";
import { PawTrendsTrainingEditor } from "@/features/training/paw-trends-training-editor";
import { PawTrendsTrainingEntryCard } from "@/features/training/paw-trends-training-entry-card";
import {
  registerPawTrendsPwa,
  requestPawTrendsPersistentStorage,
} from "@/pwa/paw-trends-pwa-registration";

export interface PawTrendsAppProps {
  store: PawTrendsProbeStore;
}

type PawTrendsAppScreen = "history" | "patterns" | "settings" | "today";

const PAW_TRENDS_NAVIGATION: readonly {
  icon: typeof Home;
  label: string;
  screen: PawTrendsAppScreen;
}[] = [
  { icon: Home, label: "Today", screen: "today" },
  { icon: History, label: "History", screen: "history" },
  { icon: Sparkles, label: "Patterns", screen: "patterns" },
  { icon: Settings, label: "Settings", screen: "settings" },
];

const EMPTY_SCREEN_COPY: Record<
  Exclude<PawTrendsAppScreen, "settings" | "today">,
  { description: string; title: string }
> = {
  history: {
    description:
      "Walks, Training, moods, and Daily Check-ins will collect here by day.",
    title: "Your history starts with the first entry.",
  },
  patterns: {
    description:
      "Paw Trends will show data-readiness counts before any Associations qualify.",
    title: "Patterns need a little history.",
  },
};

const cloneSeededReusableLabels = (): PawTrendsReusableLabels => ({
  Company: [...PAW_TRENDS_SEEDED_REUSABLE_LABELS.Company],
  "Dog Symptom": [...PAW_TRENDS_SEEDED_REUSABLE_LABELS["Dog Symptom"]],
  "Owner Symptom": [...PAW_TRENDS_SEEDED_REUSABLE_LABELS["Owner Symptom"]],
  Place: [...PAW_TRENDS_SEEDED_REUSABLE_LABELS.Place],
  "Training Type": [...PAW_TRENDS_SEEDED_REUSABLE_LABELS["Training Type"]],
  Trigger: [...PAW_TRENDS_SEEDED_REUSABLE_LABELS.Trigger],
});

/** Runs first-time setup and the phone-first Paw Trends application shell. */
export function PawTrendsApp({ store }: PawTrendsAppProps) {
  const [setupRecord, setSetupRecord] = useState<PawTrendsSetupRecord | null>(
    null
  );
  const [isReady, setIsReady] = useState(false);
  const [activeScreen, setActiveScreen] = useState<PawTrendsAppScreen>("today");

  useEffect(() => {
    let isCurrent = true;
    const loadSetupRecord = async () => {
      const savedSetup = await store.readSetupRecord();
      if (isCurrent) {
        setSetupRecord(savedSetup);
        setIsReady(true);
      }
    };
    registerPawTrendsPwa();
    void loadSetupRecord();
    return () => {
      isCurrent = false;
    };
  }, [store]);

  if (!isReady) {
    return (
      <main className="paw-loading-shell" aria-busy="true">
        <PawPrint aria-hidden="true" />
        <p>Opening your field journal…</p>
      </main>
    );
  }

  if (setupRecord === null) {
    return <PawTrendsSetup store={store} onSetupComplete={setSetupRecord} />;
  }

  return (
    <PawTrendsApplicationShell
      activeScreen={activeScreen}
      setupRecord={setupRecord}
      store={store}
      onNavigate={setActiveScreen}
    />
  );
}

interface PawTrendsSetupProps {
  store: PawTrendsProbeStore;
  onSetupComplete: (setupRecord: PawTrendsSetupRecord) => void;
}

function PawTrendsSetup({ store, onSetupComplete }: PawTrendsSetupProps) {
  const dogNameId = useId();
  const [dogName, setDogName] = useState("");
  const [labels, setLabels] = useState(cloneSeededReusableLabels);
  const [newLabels, setNewLabels] = useState<
    Record<PawTrendsReusableLabelCategory, string>
  >({
    Company: "",
    "Dog Symptom": "",
    "Owner Symptom": "",
    Place: "",
    "Training Type": "",
    Trigger: "",
  });
  const [dataOwnershipAcknowledged, setDataOwnershipAcknowledged] =
    useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const addReusableLabel = (category: PawTrendsReusableLabelCategory) => {
    const nextLabel = newLabels[category].trim();
    const isDuplicate = labels[category].some(
      (label) => label.toLocaleLowerCase() === nextLabel.toLocaleLowerCase()
    );
    if (!nextLabel || isDuplicate) {
      return;
    }
    setLabels((currentLabels) => ({
      ...currentLabels,
      [category]: [...currentLabels[category], nextLabel],
    }));
    setNewLabels((currentLabels) => ({
      ...currentLabels,
      [category]: "",
    }));
  };

  const removeReusableLabel = (
    category: PawTrendsReusableLabelCategory,
    labelToRemove: string
  ) => {
    setLabels((currentLabels) => ({
      ...currentLabels,
      [category]: currentLabels[category].filter(
        (label) => label !== labelToRemove
      ),
    }));
  };

  const completeSetup = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedDogName = dogName.trim();
    if (!normalizedDogName) {
      setErrorMessage("Enter your Dog's name to continue.");
      return;
    }
    if (!dataOwnershipAcknowledged) {
      setErrorMessage("Confirm where Paw Trends keeps your data to continue.");
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);
    const storageStatus = await requestPawTrendsPersistentStorage(
      navigator.storage
    );
    const savedSetup = await store.saveSetupRecord({
      dataOwnershipAcknowledged: true,
      dogName: normalizedDogName,
      labels,
      storageStatus,
    });
    onSetupComplete(savedSetup);
  };

  return (
    <main className="paw-setup-shell">
      <section className="paw-setup-intro" aria-labelledby="setup-title">
        <div className="paw-brand-lockup">
          <span className="paw-brand-mark" aria-hidden="true">
            <PawPrint />
          </span>
          <span>Paw Trends</span>
        </div>
        <div className="paw-setup-heading">
          <h1 id="setup-title">
            A private field journal for you and your Dog.
          </h1>
          <p>
            Name your Dog, check the labels you use, then start recording the
            day. Setup takes about a minute.
          </p>
        </div>
        <img
          className="paw-dog-illustration paw-dog-illustration-setup"
          src="/paw-trends-amstaff.png"
          alt=""
        />
      </section>

      <form
        className="paw-setup-form"
        onSubmit={(event) => {
          void completeSetup(event);
        }}
      >
        <section className="paw-setup-section" aria-labelledby="dog-name-title">
          <div className="paw-section-heading">
            <span className="paw-section-icon" aria-hidden="true">
              <PawPrint />
            </span>
            <div>
              <h2 id="dog-name-title">What is your Dog&apos;s name?</h2>
              <p>This is the only profile Paw Trends needs.</p>
            </div>
          </div>
          <label className="paw-field-label" htmlFor={dogNameId}>
            Dog&apos;s name
          </label>
          <input
            className="paw-text-input paw-dog-name-input"
            id={dogNameId}
            name="dog-name"
            autoComplete="off"
            maxLength={80}
            placeholder="For example, Mabel"
            value={dogName}
            onChange={(event) => {
              setDogName(event.target.value);
            }}
          />
        </section>

        <section className="paw-setup-section" aria-labelledby="labels-title">
          <div className="paw-section-heading">
            <span className="paw-section-icon" aria-hidden="true">
              <Tag />
            </span>
            <div>
              <h2 id="labels-title">Start with familiar labels</h2>
              <p>Keep, remove, or add labels now. You can edit them later.</p>
            </div>
          </div>
          <div className="paw-label-groups">
            {PAW_TRENDS_REUSABLE_LABEL_CATEGORIES.map((category) => (
              <fieldset className="paw-label-group" key={category}>
                <legend>{category}</legend>
                <div className="paw-label-chips">
                  {labels[category].map((label) => (
                    <span className="paw-label-chip" key={label}>
                      {label}
                      <button
                        type="button"
                        aria-label={`Remove ${label} from ${category}`}
                        onClick={() => {
                          removeReusableLabel(category, label);
                        }}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  {labels[category].length === 0 ? (
                    <span className="paw-label-empty">None yet</span>
                  ) : null}
                </div>
                <div className="paw-add-label-row">
                  <input
                    className="paw-text-input"
                    aria-label={`New ${category} label`}
                    value={newLabels[category]}
                    placeholder={`Add ${category.toLocaleLowerCase()}`}
                    onChange={(event) => {
                      setNewLabels((currentLabels) => ({
                        ...currentLabels,
                        [category]: event.target.value,
                      }));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addReusableLabel(category);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon-lg"
                    variant="outline"
                    aria-label={`Add ${category} label`}
                    onClick={() => {
                      addReusableLabel(category);
                    }}
                  >
                    <Plus aria-hidden="true" />
                  </Button>
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        <section className="paw-storage-panel" aria-labelledby="storage-title">
          <ShieldCheck aria-hidden="true" />
          <div>
            <h2 id="storage-title">Your records stay in this browser</h2>
            <p>
              Paw Trends stores observations on this device and sends none of
              them to a server. Clearing browser data can remove them, so make
              regular backups in Settings.
            </p>
            <label className="paw-acknowledgment">
              <input
                type="checkbox"
                checked={dataOwnershipAcknowledged}
                onChange={(event) => {
                  setDataOwnershipAcknowledged(event.target.checked);
                }}
              />
              <span>I understand this browser holds my Paw Trends data.</span>
            </label>
          </div>
        </section>

        {errorMessage === null ? null : (
          <p className="paw-form-error" role="alert">
            {errorMessage}
          </p>
        )}

        <Button
          className="paw-complete-setup"
          type="submit"
          size="lg"
          disabled={isSaving}
        >
          {isSaving ? "Preparing Today…" : "Complete setup and open Today"}
          <ChevronRight data-icon="inline-end" aria-hidden="true" />
        </Button>
      </form>
    </main>
  );
}

interface PawTrendsApplicationShellProps {
  activeScreen: PawTrendsAppScreen;
  setupRecord: PawTrendsSetupRecord;
  store: PawTrendsProbeStore;
  onNavigate: (screen: PawTrendsAppScreen) => void;
}

function PawTrendsApplicationShell({
  activeScreen,
  setupRecord,
  store,
  onNavigate,
}: PawTrendsApplicationShellProps) {
  let screenContent;
  if (activeScreen === "today") {
    screenContent = <PawTrendsToday setupRecord={setupRecord} store={store} />;
  } else if (activeScreen === "settings") {
    screenContent = <PawTrendsSettings setupRecord={setupRecord} />;
  } else {
    screenContent = <PawTrendsEmptyScreen screen={activeScreen} />;
  }

  return (
    <div className="paw-app-shell">
      {screenContent}
      <nav className="paw-bottom-navigation" aria-label="Primary navigation">
        {PAW_TRENDS_NAVIGATION.map(({ icon: Icon, label, screen }) => (
          <button
            type="button"
            className={activeScreen === screen ? "is-active" : undefined}
            aria-current={activeScreen === screen ? "page" : undefined}
            key={screen}
            onClick={() => {
              onNavigate(screen);
            }}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

type PawTrendsTodayEditor =
  | { kind: "activity-choice" }
  | { kind: "check-in" }
  | { entry?: PawTrendsMoodEntry; kind: "mood"; subject: PawTrendsMoodSubject }
  | { kind: "walk"; walk?: PawTrendsWalk }
  | { kind: "training"; training?: PawTrendsTraining }
  | null;

const formatDateTimeLocalValue = (date: Date): string => {
  const offsetMilliseconds = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMilliseconds)
    .toISOString()
    .slice(0, 16);
};

// oxlint-disable-next-line eslint/complexity -- Today composes three editors and their timeline entries.
function PawTrendsToday({
  setupRecord,
  store,
}: {
  setupRecord: PawTrendsSetupRecord;
  store: PawTrendsProbeStore;
}) {
  const now = new Date();
  const localDate = getPawTrendsLocalDate(now);
  const [currentSetup, setCurrentSetup] = useState(setupRecord);
  const [moodEntries, setMoodEntries] = useState<PawTrendsMoodEntry[]>([]);
  const [dogActivities, setDogActivities] = useState<PawTrendsDogActivity[]>(
    []
  );
  const [recentTriggers, setRecentTriggers] = useState<string[]>([]);
  const [dailyCheckIn, setDailyCheckIn] =
    useState<PawTrendsDailyCheckIn | null>(null);
  const [editor, setEditor] = useState<PawTrendsTodayEditor>(null);

  const loadTodayState = async () => {
    const [entries, checkIn, savedActivities, savedRecentTriggers] =
      await Promise.all([
        store.listMoodEntriesForDate(localDate),
        store.readDailyCheckIn(localDate),
        store.listDogActivitiesForDate(localDate),
        store.listRecentTriggerLabels(3),
      ]);
    setMoodEntries(entries);
    setDailyCheckIn(checkIn);
    setDogActivities(savedActivities);
    setRecentTriggers(savedRecentTriggers);
  };

  useEffect(() => {
    let isCurrent = true;
    const loadInitialTodayState = async () => {
      const [entries, checkIn, savedActivities, savedRecentTriggers] =
        await Promise.all([
          store.listMoodEntriesForDate(localDate),
          store.readDailyCheckIn(localDate),
          store.listDogActivitiesForDate(localDate),
          store.listRecentTriggerLabels(3),
        ]);
      if (isCurrent) {
        setMoodEntries(entries);
        setDailyCheckIn(checkIn);
        setDogActivities(savedActivities);
        setRecentTriggers(savedRecentTriggers);
      }
    };
    void loadInitialTodayState();
    return () => {
      isCurrent = false;
    };
  }, [store, localDate]);

  const currentTimestamp = now.toISOString();
  const dogMood = moodEntries.findLast(
    (entry) => entry.subject === "dog" && entry.recordedAt <= currentTimestamp
  );
  const ownerMood = moodEntries.findLast(
    (entry) => entry.subject === "owner" && entry.recordedAt <= currentTimestamp
  );
  const todayLabel = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(now);
  const entryCount =
    moodEntries.length + dogActivities.length + (dailyCheckIn ? 1 : 0);
  let dailyCheckInStatus = "Not completed";
  if (dailyCheckIn) {
    dailyCheckInStatus =
      dailyCheckIn.ownerSymptoms.length === 0
        ? "Completed · Symptom-free"
        : `Completed · ${dailyCheckIn.ownerSymptoms.join(", ")}`;
  }
  const timelineEntries = [
    ...moodEntries.map((entry) => ({
      entry,
      kind: "mood" as const,
      timestamp: entry.recordedAt,
    })),
    ...dogActivities.map((activity) =>
      activity.kind === "walk"
        ? {
            entry: activity,
            kind: "walk" as const,
            timestamp: activity.startedAt,
          }
        : {
            entry: activity,
            kind: "training" as const,
            timestamp: activity.startedAt,
          }
    ),
    ...(dailyCheckIn
      ? [
          {
            entry: dailyCheckIn,
            kind: "check-in" as const,
            timestamp: dailyCheckIn.updatedAt,
          },
        ]
      : []),
  ].toSorted((left, right) => right.timestamp.localeCompare(left.timestamp));

  return (
    <main className="paw-app-content">
      <header className="paw-today-header">
        <div className="paw-brand-lockup paw-brand-lockup-compact">
          <span className="paw-brand-mark" aria-hidden="true">
            <PawPrint />
          </span>
          <span>Paw Trends</span>
        </div>
        <p>{todayLabel}</p>
        <h1>Today with {currentSetup.dogName}</h1>
      </header>

      <section className="paw-status-sheet" aria-label="Today's status">
        <PawTrendsStatusRow
          icon={HeartPulse}
          title={`${currentSetup.dogName}'s mood`}
          value={dogMood?.mood ?? "No Dog Mood logged"}
          action={dogMood ? "Change mood" : "Add mood"}
          onAction={() => {
            setEditor({ kind: "mood", subject: "dog" });
          }}
        />
        <PawTrendsStatusRow
          icon={CircleUserRound}
          title="Your mood"
          value={ownerMood?.mood ?? "No Owner Mood logged"}
          action={ownerMood ? "Change mood" : "Add mood"}
          onAction={() => {
            setEditor({ kind: "mood", subject: "owner" });
          }}
        />
        <PawTrendsStatusRow
          icon={ListChecks}
          title="Daily Check-in"
          value={dailyCheckInStatus}
          action={dailyCheckIn ? "Edit" : "Check in"}
          onAction={() => {
            setEditor({ kind: "check-in" });
          }}
        />
      </section>

      {editor?.kind === "mood" ? (
        <PawTrendsMoodEditor
          editor={editor}
          onCancel={() => {
            setEditor(null);
          }}
          onSaved={async () => {
            await loadTodayState();
            setEditor(null);
          }}
          store={store}
        />
      ) : null}
      {editor?.kind === "check-in" ? (
        <PawTrendsCheckInEditor
          initialCheckIn={dailyCheckIn}
          initialDate={localDate}
          ownerSymptoms={currentSetup.labels["Owner Symptom"]}
          onCancel={() => {
            setEditor(null);
          }}
          onSaved={async () => {
            await loadTodayState();
            setEditor(null);
          }}
          store={store}
        />
      ) : null}

      {editor?.kind === "walk" ? (
        <PawTrendsWalkEditor
          {...(editor.walk === undefined ? {} : { initialWalk: editor.walk })}
          labels={currentSetup.labels}
          recentTriggers={recentTriggers}
          store={store}
          onCancel={() => {
            setEditor(null);
          }}
          onLabelsChanged={setCurrentSetup}
          onSaved={async () => {
            await loadTodayState();
            setEditor(null);
          }}
        />
      ) : null}

      {editor?.kind === "training" ? (
        <PawTrendsTrainingEditor
          {...(editor.training === undefined
            ? {}
            : { initialTraining: editor.training })}
          labels={currentSetup.labels}
          store={store}
          onCancel={() => {
            setEditor(null);
          }}
          onLabelsChanged={setCurrentSetup}
          onSaved={async () => {
            await loadTodayState();
            setEditor(null);
          }}
        />
      ) : null}

      {editor?.kind === "activity-choice" ? (
        <section
          className="paw-activity-choice"
          aria-labelledby="activity-choice-title"
        >
          <div className="paw-inline-editor-heading">
            <div>
              <span>Completed activity</span>
              <h2 id="activity-choice-title">What did you log?</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditor(null);
              }}
            >
              Close
            </button>
          </div>
          <div>
            <Button
              type="button"
              onClick={() => {
                setEditor({ kind: "walk" });
              }}
            >
              Walk
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditor({ kind: "training" });
              }}
            >
              Training
            </Button>
          </div>
        </section>
      ) : null}

      <Button
        className="paw-log-activity"
        size="lg"
        type="button"
        onClick={() => {
          setEditor({ kind: "activity-choice" });
        }}
      >
        <Plus data-icon="inline-start" aria-hidden="true" />
        Log activity
      </Button>

      <section className="paw-today-entries" aria-labelledby="entries-title">
        <div className="paw-entries-heading">
          <h2 id="entries-title">Today&apos;s entries</h2>
          <span>
            {entryCount} {entryCount === 1 ? "entry" : "entries"}
          </span>
        </div>
        {entryCount === 0 ? (
          <div className="paw-empty-journal">
            <img
              className="paw-dog-illustration paw-dog-illustration-empty"
              src="/paw-trends-amstaff.png"
              alt=""
            />
            <div>
              <h3>The page is open.</h3>
              <p>
                Your moods and Daily Check-in will appear here in time order.
              </p>
            </div>
          </div>
        ) : (
          <div className="paw-entry-list">
            {timelineEntries.map((timelineEntry) => {
              if (timelineEntry.kind === "mood") {
                const { entry } = timelineEntry;
                return (
                  <PawTrendsMoodEntryCard
                    entry={entry}
                    key={entry.id}
                    moodEntries={moodEntries}
                    onDeleted={loadTodayState}
                    onEdit={() => {
                      setEditor({
                        entry,
                        kind: "mood",
                        subject: entry.subject,
                      });
                    }}
                    store={store}
                  />
                );
              }
              if (timelineEntry.kind === "walk") {
                return (
                  <PawTrendsWalkEntryCard
                    key={timelineEntry.entry.id}
                    walk={timelineEntry.entry}
                    store={store}
                    onDeleted={loadTodayState}
                    onEdit={() => {
                      setEditor({ kind: "walk", walk: timelineEntry.entry });
                    }}
                  />
                );
              }
              if (timelineEntry.kind === "training") {
                return (
                  <PawTrendsTrainingEntryCard
                    key={timelineEntry.entry.id}
                    training={timelineEntry.entry}
                    store={store}
                    onDeleted={loadTodayState}
                    onEdit={() => {
                      setEditor({
                        kind: "training",
                        training: timelineEntry.entry,
                      });
                    }}
                  />
                );
              }
              return (
                <button
                  className="paw-entry-card paw-check-in-entry"
                  key="daily-check-in"
                  type="button"
                  onClick={() => {
                    setEditor({ kind: "check-in" });
                  }}
                >
                  <ListChecks aria-hidden="true" />
                  <span>
                    <strong>Daily Check-in</strong>
                    {timelineEntry.entry.ownerSymptoms.length === 0
                      ? "Symptom-free"
                      : timelineEntry.entry.ownerSymptoms.join(", ")}
                  </span>
                  <span>Edit</span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

interface PawTrendsStatusRowProps {
  action: string;
  icon: typeof Activity;
  title: string;
  value: string;
  onAction: () => void;
}

function PawTrendsStatusRow({
  action,
  icon: Icon,
  title,
  value,
  onAction,
}: PawTrendsStatusRowProps) {
  return (
    <div className="paw-status-row">
      <span className="paw-status-icon" aria-hidden="true">
        <Icon />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{value}</p>
      </div>
      <Button type="button" variant="ghost" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}

function PawTrendsMoodEditor({
  editor,
  onCancel,
  onSaved,
  store,
}: {
  editor: Extract<PawTrendsTodayEditor, { kind: "mood" }>;
  onCancel: () => void;
  onSaved: () => Promise<void>;
  store: PawTrendsProbeStore;
}) {
  const moods =
    editor.subject === "dog" ? PAW_TRENDS_DOG_MOODS : PAW_TRENDS_OWNER_MOODS;
  const [mood, setMood] = useState(editor.entry?.mood ?? moods[0]);
  const [recordedAt, setRecordedAt] = useState(
    formatDateTimeLocalValue(
      editor.entry ? new Date(editor.entry.recordedAt) : new Date()
    )
  );
  const [notes, setNotes] = useState(editor.entry?.notes ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const saveMood = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedDate = new Date(recordedAt);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      formatDateTimeLocalValue(parsedDate) !== recordedAt
    ) {
      setErrorMessage("Choose a valid local date and time.");
      return;
    }
    try {
      await store.saveMoodEntry({
        id: editor.entry?.id,
        localDate: getPawTrendsLocalDate(parsedDate),
        mood,
        notes:
          editor.subject === "owner" && notes.trim() ? notes.trim() : undefined,
        recordedAt: parsedDate.toISOString(),
        subject: editor.subject,
      });
      await onSaved();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "The mood could not be saved."
      );
    }
  };

  const subjectLabel = editor.subject === "dog" ? "Dog Mood" : "Owner Mood";
  const updateMoodSelection = (selectedValue: string) => {
    const selectedMood = moods.find(
      (moodOption) => moodOption === selectedValue
    );
    if (selectedMood !== undefined) {
      setMood(selectedMood);
    }
  };
  return (
    <form
      className="paw-inline-editor"
      onSubmit={(event) => {
        void saveMood(event);
      }}
    >
      <div className="paw-inline-editor-heading">
        <div>
          <span>{editor.entry ? "Edit" : "Record"}</span>
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
            updateMoodSelection(event.target.value);
          }}
        >
          {moods.map((moodOption) => (
            <option key={moodOption} value={moodOption}>
              {moodOption}
            </option>
          ))}
        </select>
      </label>
      <label>
        When
        <input
          max={formatDateTimeLocalValue(new Date())}
          required
          type="datetime-local"
          value={recordedAt}
          onChange={(event) => {
            setRecordedAt(event.target.value);
          }}
        />
      </label>
      {editor.subject === "owner" ? (
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

function PawTrendsCheckInEditor({
  initialCheckIn,
  initialDate,
  onCancel,
  onSaved,
  ownerSymptoms,
  store,
}: {
  initialCheckIn: PawTrendsDailyCheckIn | null;
  initialDate: string;
  onCancel: () => void;
  onSaved: () => Promise<void>;
  ownerSymptoms: string[];
  store: PawTrendsProbeStore;
}) {
  const [checkInDate, setCheckInDate] = useState(initialDate);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(
    initialCheckIn?.ownerSymptoms ?? []
  );

  useEffect(() => {
    let isCurrent = true;
    const loadCheckIn = async () => {
      const savedCheckIn = await store.readDailyCheckIn(checkInDate);
      if (isCurrent) {
        setSelectedSymptoms(savedCheckIn?.ownerSymptoms ?? []);
      }
    };
    void loadCheckIn();
    return () => {
      isCurrent = false;
    };
  }, [checkInDate, store]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((current) =>
      current.includes(symptom)
        ? current.filter((item) => item !== symptom)
        : [...current, symptom]
    );
  };

  return (
    <form
      className="paw-inline-editor"
      onSubmit={(event) => {
        event.preventDefault();
        const saveCheckIn = async () => {
          await store.saveDailyCheckIn(checkInDate, selectedSymptoms);
          await onSaved();
        };
        void saveCheckIn();
      }}
    >
      <div className="paw-inline-editor-heading">
        <div>
          <span>Complete or edit</span>
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
          value={checkInDate}
          onChange={(event) => {
            setCheckInDate(event.target.value);
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
      <Button type="submit">
        <Save aria-hidden="true" />
        Save check-in
      </Button>
    </form>
  );
}

function PawTrendsMoodEntryCard({
  entry,
  moodEntries,
  onDeleted,
  onEdit,
  store,
}: {
  entry: PawTrendsMoodEntry;
  moodEntries: PawTrendsMoodEntry[];
  onDeleted: () => Promise<void>;
  onEdit: () => void;
  store: PawTrendsProbeStore;
}) {
  const start = new Date(entry.recordedAt);
  const intervalEnd = new Date(getPawTrendsMoodIntervalEnd(entry, moodEntries));
  const timeFormat = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isMidnight =
    intervalEnd.getHours() === 0 && intervalEnd.getMinutes() === 0;

  return (
    <article className="paw-entry-card">
      <span
        className={`paw-entry-subject is-${entry.subject}`}
        aria-hidden="true"
      >
        {entry.subject === "dog" ? <PawPrint /> : <CircleUserRound />}
      </span>
      <div>
        <span>{entry.subject === "dog" ? "Dog Mood" : "Owner Mood"}</span>
        <h3>{entry.mood}</h3>
        <p>
          {timeFormat.format(start)} to{" "}
          {isMidnight ? "midnight" : timeFormat.format(intervalEnd)}
        </p>
        {entry.notes === undefined ? null : <p>{entry.notes}</p>}
      </div>
      <div className="paw-entry-actions">
        <button type="button" onClick={onEdit}>
          Edit
        </button>
        <button
          type="button"
          aria-label={`Delete ${entry.subject === "dog" ? "Dog" : "Owner"} Mood at ${timeFormat.format(start)}`}
          onClick={() => {
            const deleteEntry = async () => {
              await store.deleteMoodEntry(entry.id);
              await onDeleted();
            };
            void deleteEntry();
          }}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function PawTrendsEmptyScreen({
  screen,
}: {
  screen: Exclude<PawTrendsAppScreen, "settings" | "today">;
}) {
  const copy = EMPTY_SCREEN_COPY[screen];
  const title = screen === "history" ? "History" : "Patterns";
  const Icon = screen === "history" ? Clock3 : Sparkles;

  return (
    <main className="paw-app-content paw-secondary-screen">
      <header>
        <div className="paw-brand-lockup paw-brand-lockup-compact">
          <span className="paw-brand-mark" aria-hidden="true">
            <PawPrint />
          </span>
          <span>Paw Trends</span>
        </div>
        <h1>{title}</h1>
      </header>
      <section className="paw-secondary-empty">
        <Icon aria-hidden="true" />
        <h2>{copy.title}</h2>
        <p>{copy.description}</p>
      </section>
    </main>
  );
}

function PawTrendsSettings({
  setupRecord,
}: {
  setupRecord: PawTrendsSetupRecord;
}) {
  return (
    <main className="paw-app-content paw-secondary-screen">
      <header>
        <div className="paw-brand-lockup paw-brand-lockup-compact">
          <span className="paw-brand-mark" aria-hidden="true">
            <PawPrint />
          </span>
          <span>Paw Trends</span>
        </div>
        <h1>Settings</h1>
      </header>
      <section className="paw-settings-list" aria-label="Current setup">
        <div>
          <span>Dog</span>
          <strong>{setupRecord.dogName}</strong>
        </div>
        <div>
          <span>Reusable labels</span>
          <strong>
            {Object.values(setupRecord.labels).flat().length} saved
          </strong>
        </div>
        <div>
          <span>Browser storage</span>
          <strong>
            {setupRecord.storageStatus === "granted"
              ? "Extra protection granted"
              : "Managed by this browser"}
          </strong>
        </div>
        <div>
          <span>Data location</span>
          <strong>This browser only</strong>
        </div>
      </section>
      <aside className="paw-settings-note">
        <ShieldCheck aria-hidden="true" />
        <p>
          Your observation data stays on this device. Backup and restore tools
          will live here as Paw Trends grows.
        </p>
      </aside>
    </main>
  );
}
