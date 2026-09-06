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
  PawTrendsProbeStore,
  PawTrendsReusableLabelCategory,
  PawTrendsReusableLabels,
  PawTrendsSetupRecord,
} from "@/persistence/paw-trends-probe-store";
import {
  PAW_TRENDS_REUSABLE_LABEL_CATEGORIES,
  PAW_TRENDS_SEEDED_REUSABLE_LABELS,
} from "@/persistence/paw-trends-probe-store";
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
  onNavigate: (screen: PawTrendsAppScreen) => void;
}

function PawTrendsApplicationShell({
  activeScreen,
  setupRecord,
  onNavigate,
}: PawTrendsApplicationShellProps) {
  let screenContent;
  if (activeScreen === "today") {
    screenContent = <PawTrendsToday dogName={setupRecord.dogName} />;
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

function PawTrendsToday({ dogName }: { dogName: string }) {
  const today = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    weekday: "long",
  }).format(new Date());

  return (
    <main className="paw-app-content">
      <header className="paw-today-header">
        <div className="paw-brand-lockup paw-brand-lockup-compact">
          <span className="paw-brand-mark" aria-hidden="true">
            <PawPrint />
          </span>
          <span>Paw Trends</span>
        </div>
        <p>{today}</p>
        <h1>Today with {dogName}</h1>
      </header>

      <section className="paw-status-sheet" aria-label="Today's status">
        <PawTrendsStatusRow
          icon={HeartPulse}
          title={`${dogName}'s mood`}
          value="No Dog Mood logged"
          action="Add mood"
        />
        <PawTrendsStatusRow
          icon={CircleUserRound}
          title="Your mood"
          value="No Owner Mood logged"
          action="Add mood"
        />
        <PawTrendsStatusRow
          icon={ListChecks}
          title="Daily Check-in"
          value="Not completed"
          action="Check in"
        />
      </section>

      <Button className="paw-log-activity" size="lg">
        <Plus data-icon="inline-start" aria-hidden="true" />
        Log activity
      </Button>

      <section className="paw-today-entries" aria-labelledby="entries-title">
        <div className="paw-entries-heading">
          <h2 id="entries-title">Today&apos;s entries</h2>
          <span>0 entries</span>
        </div>
        <div className="paw-empty-journal">
          <img
            className="paw-dog-illustration paw-dog-illustration-empty"
            src="/paw-trends-amstaff.png"
            alt=""
          />
          <div>
            <h3>The page is open.</h3>
            <p>
              Walks, Training, moods, and your Daily Check-in will appear here
              in time order.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

interface PawTrendsStatusRowProps {
  action: string;
  icon: typeof Activity;
  title: string;
  value: string;
}

function PawTrendsStatusRow({
  action,
  icon: Icon,
  title,
  value,
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
      <Button type="button" variant="ghost">
        {action}
      </Button>
    </div>
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
