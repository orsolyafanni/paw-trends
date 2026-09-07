import { Dexie } from "dexie";
import type { Table } from "dexie";

const PAW_TRENDS_PROBE_DATABASE = "paw-trends-local";

export const PAW_TRENDS_REUSABLE_LABEL_CATEGORIES = [
  "Trigger",
  "Place",
  "Training Type",
  "Dog Symptom",
  "Owner Symptom",
  "Company",
] as const;

export type PawTrendsReusableLabelCategory =
  (typeof PAW_TRENDS_REUSABLE_LABEL_CATEGORIES)[number];

export type PawTrendsReusableLabels = Record<
  PawTrendsReusableLabelCategory,
  string[]
>;

export const PAW_TRENDS_SEEDED_REUSABLE_LABELS: PawTrendsReusableLabels = {
  Company: [],
  "Dog Symptom": ["Limping", "Robot-like movement"],
  "Owner Symptom": [],
  Place: ["Home route", "Lake11"],
  "Training Type": ["Mantrailing", "Physio"],
  Trigger: ["Dog", "Cat"],
};

export interface PawTrendsSetupRecord {
  id: "primary-owner";
  completedAt: string;
  dataOwnershipAcknowledged: true;
  dogName: string;
  labels: PawTrendsReusableLabels;
  schemaVersion: 2;
  storageStatus: "browser-managed" | "granted";
}

export type PawTrendsProbeRecordId = "owner-sample";

export interface PawTrendsProbeRecord {
  id: PawTrendsProbeRecordId;
  note: string;
  savedAt: string;
  schemaVersion: 1;
}

export const PAW_TRENDS_DOG_MOODS = [
  "Playful",
  "Sleepy",
  "Grumpy",
  "Hate-the-world",
  "Overwhelmed",
  "Tense",
  "Aggressive",
] as const;

export const PAW_TRENDS_OWNER_MOODS = [
  "Good",
  "Relaxed",
  "Anxious",
  "Moody",
  "Sad",
  "Stressed",
] as const;

export type PawTrendsDogMood = (typeof PAW_TRENDS_DOG_MOODS)[number];
export type PawTrendsOwnerMood = (typeof PAW_TRENDS_OWNER_MOODS)[number];
export type PawTrendsMoodSubject = "dog" | "owner";

export interface PawTrendsMoodEntry {
  id: string;
  localDate: string;
  mood: PawTrendsDogMood | PawTrendsOwnerMood;
  notes?: string;
  recordedAt: string;
  subject: PawTrendsMoodSubject;
}

export interface PawTrendsDailyCheckIn {
  completedAt: string;
  localDate: string;
  ownerSymptoms: string[];
  updatedAt: string;
}

export type PawTrendsReactionSeverity = 0 | 1 | 2 | 3 | 4 | 5;

export interface PawTrendsTriggerEncounter {
  id: string;
  reactionSeverity: PawTrendsReactionSeverity;
  trigger: string;
}

export interface PawTrendsWalk {
  activityMood: PawTrendsDogMood;
  company: string[];
  createdAt: string;
  dogSymptoms: string[];
  durationMinutes: number;
  id: string;
  localDate: string;
  place: string;
  startedAt: string;
  triggerEncounters: PawTrendsTriggerEncounter[];
  updatedAt: string;
}

export interface PawTrendsWalkReactionSummary {
  averageSeverity: number;
  peakSeverity: PawTrendsReactionSeverity;
  reactiveEncounters: number;
  totalEncounters: number;
}

export interface PawTrendsProbeStore {
  deleteWalk: (id: string) => Promise<void>;
  deleteMoodEntry: (id: string) => Promise<void>;
  listMoodEntriesForDate: (localDate: string) => Promise<PawTrendsMoodEntry[]>;
  listRecentTriggerLabels: (limit: number) => Promise<string[]>;
  listWalksForDate: (localDate: string) => Promise<PawTrendsWalk[]>;
  readDailyCheckIn: (
    localDate: string
  ) => Promise<PawTrendsDailyCheckIn | null>;
  readSetupRecord: () => Promise<PawTrendsSetupRecord | null>;
  readSampleRecord: () => Promise<PawTrendsProbeRecord | null>;
  replaceSampleRecord: (record: PawTrendsProbeRecord | null) => Promise<void>;
  saveSetupRecord: (
    setup: Omit<PawTrendsSetupRecord, "completedAt" | "id" | "schemaVersion">
  ) => Promise<PawTrendsSetupRecord>;
  saveDailyCheckIn: (
    localDate: string,
    ownerSymptoms: string[]
  ) => Promise<PawTrendsDailyCheckIn>;
  saveMoodEntry: (
    entry: Omit<PawTrendsMoodEntry, "id"> & { id?: string }
  ) => Promise<PawTrendsMoodEntry>;
  saveReusableLabel: (
    category: PawTrendsReusableLabelCategory,
    label: string
  ) => Promise<PawTrendsSetupRecord>;
  saveSampleRecord: (note: string) => Promise<PawTrendsProbeRecord>;
  saveWalk: (
    walk: Omit<PawTrendsWalk, "createdAt" | "id" | "updatedAt"> & {
      id?: string;
    }
  ) => Promise<PawTrendsWalk>;
}

const PAW_TRENDS_SAMPLE_RECORD_ID: PawTrendsProbeRecordId = "owner-sample";
const PAW_TRENDS_SETUP_RECORD_ID: PawTrendsSetupRecord["id"] = "primary-owner";

class PawTrendsProbeDatabase extends Dexie {
  dailyCheckIns!: Table<PawTrendsDailyCheckIn, string>;
  moodEntries!: Table<PawTrendsMoodEntry, string>;
  records!: Table<PawTrendsProbeRecord, PawTrendsProbeRecordId>;
  setup!: Table<PawTrendsSetupRecord, PawTrendsSetupRecord["id"]>;
  walks!: Table<PawTrendsWalk, string>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({ records: "id" });
    this.version(2).stores({ records: "id", setup: "id" });
    this.version(3).stores({
      dailyCheckIns: "localDate",
      moodEntries: "id, localDate, [subject+recordedAt]",
      records: "id",
      setup: "id",
    });
    this.version(4).stores({
      dailyCheckIns: "localDate",
      moodEntries: "id, localDate, [subject+recordedAt]",
      records: "id",
      setup: "id",
      walks: "id, localDate, startedAt",
    });
  }
}

/** Derives separate encounter counts and severity measures, including zeroes. */
export const calculatePawTrendsWalkReactionSummary = (
  encounters: readonly PawTrendsTriggerEncounter[]
): PawTrendsWalkReactionSummary => {
  if (encounters.length === 0) {
    return {
      averageSeverity: 0,
      peakSeverity: 0,
      reactiveEncounters: 0,
      totalEncounters: 0,
    };
  }
  const severityTotal = encounters.reduce(
    (total, encounter) => total + encounter.reactionSeverity,
    0
  );
  let peakSeverity: PawTrendsReactionSeverity = 0;
  for (const encounter of encounters) {
    if (encounter.reactionSeverity > peakSeverity) {
      peakSeverity = encounter.reactionSeverity;
    }
  }
  return {
    averageSeverity: severityTotal / encounters.length,
    peakSeverity,
    reactiveEncounters: encounters.filter(
      (encounter) => encounter.reactionSeverity > 0
    ).length,
    totalEncounters: encounters.length,
  };
};

const normalizePawTrendsWalkLabels = (labels: readonly string[]): string[] =>
  [...new Set(labels.map((label) => label.trim()).filter(Boolean))].toSorted();

const requireConfiguredPawTrendsLabel = (
  configuredLabels: readonly string[],
  label: string,
  fieldName: string
) => {
  if (
    !configuredLabels.some(
      (configured) =>
        configured.toLocaleLowerCase() === label.toLocaleLowerCase()
    )
  ) {
    throw new Error(`Walk ${fieldName} must use a saved label.`);
  }
};

/** Returns the local calendar date for a timestamp without converting it to UTC. */
export const getPawTrendsLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/** Calculates a Mood Interval end at the next same-day mood or local midnight. */
export const getPawTrendsMoodIntervalEnd = (
  entry: PawTrendsMoodEntry,
  sameSubjectEntries: readonly PawTrendsMoodEntry[]
): string => {
  const [nextEntry] = sameSubjectEntries
    .filter(
      (candidate) =>
        candidate.subject === entry.subject &&
        candidate.localDate === entry.localDate &&
        candidate.recordedAt > entry.recordedAt
    )
    .toSorted((left, right) => left.recordedAt.localeCompare(right.recordedAt));
  if (nextEntry !== undefined) {
    return nextEntry.recordedAt;
  }

  const [year, month, day] = entry.localDate.split("-").map(Number);
  return new Date(year, month - 1, day + 1).toISOString();
};

/** Creates the device-local store for setup and the original proof record. */
export const createPawTrendsProbeStore = (_options?: {
  databaseName?: string;
}): PawTrendsProbeStore => {
  const database = new PawTrendsProbeDatabase(
    _options?.databaseName ?? PAW_TRENDS_PROBE_DATABASE
  );

  return {
    deleteWalk: async (id) => {
      await database.walks.delete(id);
    },
    deleteMoodEntry: async (id) => {
      await database.moodEntries.delete(id);
    },
    listMoodEntriesForDate: async (localDate) =>
      await database.moodEntries
        .where("localDate")
        .equals(localDate)
        .sortBy("recordedAt"),
    listRecentTriggerLabels: async (limit) => {
      const savedWalks = await database.walks.orderBy("startedAt").toArray();
      const walks = savedWalks.toReversed();
      const recent: string[] = [];
      for (const walk of walks) {
        for (const encounter of walk.triggerEncounters.toReversed()) {
          if (!recent.includes(encounter.trigger)) {
            recent.push(encounter.trigger);
          }
          if (recent.length >= limit) {
            return recent;
          }
        }
      }
      return recent;
    },
    listWalksForDate: async (localDate) =>
      await database.walks
        .where("localDate")
        .equals(localDate)
        .sortBy("startedAt"),
    readDailyCheckIn: async (localDate) =>
      (await database.dailyCheckIns.get(localDate)) ?? null,
    readSetupRecord: async () =>
      (await database.setup.get(PAW_TRENDS_SETUP_RECORD_ID)) ?? null,
    readSampleRecord: async () =>
      (await database.records.get(PAW_TRENDS_SAMPLE_RECORD_ID)) ?? null,
    replaceSampleRecord: async (record) => {
      await database.transaction("rw", database.records, async () => {
        await database.records.clear();
        if (record) {
          await database.records.put(record);
        }
      });
    },
    saveSetupRecord: async (setup) => {
      const setupRecord: PawTrendsSetupRecord = {
        ...setup,
        completedAt: new Date().toISOString(),
        id: PAW_TRENDS_SETUP_RECORD_ID,
        schemaVersion: 2,
      };
      await database.setup.put(setupRecord);
      return setupRecord;
    },
    saveDailyCheckIn: async (localDate, ownerSymptoms) => {
      const existing = await database.dailyCheckIns.get(localDate);
      const now = new Date().toISOString();
      const checkIn: PawTrendsDailyCheckIn = {
        completedAt: existing?.completedAt ?? now,
        localDate,
        ownerSymptoms: [...new Set(ownerSymptoms)].toSorted(),
        updatedAt: now,
      };
      await database.dailyCheckIns.put(checkIn);
      return checkIn;
    },
    saveMoodEntry: async (entry) => {
      const duplicate = await database.moodEntries
        .where("[subject+recordedAt]")
        .equals([entry.subject, entry.recordedAt])
        .first();
      if (duplicate && duplicate.id !== entry.id) {
        const subjectName = entry.subject === "dog" ? "Dog Mood" : "Owner Mood";
        throw new Error(`${subjectName} already exists at this time.`);
      }
      const savedEntry: PawTrendsMoodEntry = {
        ...entry,
        id: entry.id ?? crypto.randomUUID(),
      };
      await database.moodEntries.put(savedEntry);
      return savedEntry;
    },
    saveReusableLabel: async (category, label) => {
      const normalizedLabel = label.trim();
      if (normalizedLabel.length === 0 || normalizedLabel.length > 80) {
        throw new Error(
          `${category} label must be between 1 and 80 characters.`
        );
      }
      const setup = await database.setup.get(PAW_TRENDS_SETUP_RECORD_ID);
      if (!setup) {
        throw new Error("Reusable label cannot be saved before setup.");
      }
      if (
        setup.labels[category].some(
          (savedLabel) =>
            savedLabel.toLocaleLowerCase() ===
            normalizedLabel.toLocaleLowerCase()
        )
      ) {
        return setup;
      }
      const updatedSetup = {
        ...setup,
        labels: {
          ...setup.labels,
          [category]: [...setup.labels[category], normalizedLabel],
        },
      };
      await database.setup.put(updatedSetup);
      return updatedSetup;
    },
    saveSampleRecord: async (note) => {
      const record: PawTrendsProbeRecord = {
        id: PAW_TRENDS_SAMPLE_RECORD_ID,
        note,
        savedAt: new Date().toISOString(),
        schemaVersion: 1,
      };
      await database.records.put(record);
      return record;
    },
    saveWalk: async (walk) => {
      const setup = await database.setup.get(PAW_TRENDS_SETUP_RECORD_ID);
      if (!setup) {
        throw new Error("Walk cannot be saved before setup.");
      }
      const startedAt = new Date(walk.startedAt);
      if (
        Number.isNaN(startedAt.getTime()) ||
        getPawTrendsLocalDate(startedAt) !== walk.localDate
      ) {
        throw new Error("Walk date and time must be valid and agree.");
      }
      if (
        !Number.isInteger(walk.durationMinutes) ||
        walk.durationMinutes <= 0
      ) {
        throw new Error(
          "Walk duration must be a positive whole number of minutes."
        );
      }
      if (!PAW_TRENDS_DOG_MOODS.includes(walk.activityMood)) {
        throw new Error("Walk requires an Activity Mood confirmation.");
      }
      const place = walk.place.trim();
      if (!place) {
        throw new Error("Walk requires one Place.");
      }
      requireConfiguredPawTrendsLabel(setup.labels.Place, place, "Place");
      const company = normalizePawTrendsWalkLabels(walk.company);
      const dogSymptoms = normalizePawTrendsWalkLabels(walk.dogSymptoms);
      for (const label of company) {
        requireConfiguredPawTrendsLabel(setup.labels.Company, label, "Company");
      }
      for (const label of dogSymptoms) {
        requireConfiguredPawTrendsLabel(
          setup.labels["Dog Symptom"],
          label,
          "Dog Symptom"
        );
      }
      if (
        new Set(walk.triggerEncounters.map((encounter) => encounter.id))
          .size !== walk.triggerEncounters.length
      ) {
        throw new Error("Walk Trigger Encounters must have distinct IDs.");
      }
      for (const encounter of walk.triggerEncounters) {
        const trigger = encounter.trigger.trim();
        requireConfiguredPawTrendsLabel(
          setup.labels.Trigger,
          trigger,
          "Trigger"
        );
        if (
          !Number.isInteger(encounter.reactionSeverity) ||
          encounter.reactionSeverity < 0 ||
          encounter.reactionSeverity > 5
        ) {
          throw new Error(
            "Trigger Encounter Reaction Severity must be 0 through 5."
          );
        }
      }
      const existing =
        walk.id === undefined ? undefined : await database.walks.get(walk.id);
      const now = new Date().toISOString();
      const savedWalk: PawTrendsWalk = {
        ...walk,
        company,
        createdAt: existing?.createdAt ?? now,
        dogSymptoms,
        id: walk.id ?? crypto.randomUUID(),
        place,
        triggerEncounters: walk.triggerEncounters.map((encounter) => ({
          ...encounter,
          trigger: encounter.trigger.trim(),
        })),
        updatedAt: now,
      };
      await database.walks.put(savedWalk);
      return savedWalk;
    },
  };
};
