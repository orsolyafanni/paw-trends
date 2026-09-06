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

export interface PawTrendsProbeStore {
  deleteMoodEntry: (id: string) => Promise<void>;
  listMoodEntriesForDate: (localDate: string) => Promise<PawTrendsMoodEntry[]>;
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
  saveSampleRecord: (note: string) => Promise<PawTrendsProbeRecord>;
}

const PAW_TRENDS_SAMPLE_RECORD_ID: PawTrendsProbeRecordId = "owner-sample";
const PAW_TRENDS_SETUP_RECORD_ID: PawTrendsSetupRecord["id"] = "primary-owner";

class PawTrendsProbeDatabase extends Dexie {
  dailyCheckIns!: Table<PawTrendsDailyCheckIn, string>;
  moodEntries!: Table<PawTrendsMoodEntry, string>;
  records!: Table<PawTrendsProbeRecord, PawTrendsProbeRecordId>;
  setup!: Table<PawTrendsSetupRecord, PawTrendsSetupRecord["id"]>;

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
  }
}

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
    deleteMoodEntry: async (id) => {
      await database.moodEntries.delete(id);
    },
    listMoodEntriesForDate: async (localDate) =>
      await database.moodEntries
        .where("localDate")
        .equals(localDate)
        .sortBy("recordedAt"),
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
  };
};
