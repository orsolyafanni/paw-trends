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

export interface PawTrendsProbeStore {
  readSetupRecord: () => Promise<PawTrendsSetupRecord | null>;
  readSampleRecord: () => Promise<PawTrendsProbeRecord | null>;
  replaceSampleRecord: (record: PawTrendsProbeRecord | null) => Promise<void>;
  saveSetupRecord: (
    setup: Omit<PawTrendsSetupRecord, "completedAt" | "id" | "schemaVersion">
  ) => Promise<PawTrendsSetupRecord>;
  saveSampleRecord: (note: string) => Promise<PawTrendsProbeRecord>;
}

const PAW_TRENDS_SAMPLE_RECORD_ID: PawTrendsProbeRecordId = "owner-sample";
const PAW_TRENDS_SETUP_RECORD_ID: PawTrendsSetupRecord["id"] = "primary-owner";

class PawTrendsProbeDatabase extends Dexie {
  records!: Table<PawTrendsProbeRecord, PawTrendsProbeRecordId>;
  setup!: Table<PawTrendsSetupRecord, PawTrendsSetupRecord["id"]>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({ records: "id" });
    this.version(2).stores({ records: "id", setup: "id" });
  }
}

/** Creates the device-local store for setup and the original proof record. */
export const createPawTrendsProbeStore = (_options?: {
  databaseName?: string;
}): PawTrendsProbeStore => {
  const database = new PawTrendsProbeDatabase(
    _options?.databaseName ?? PAW_TRENDS_PROBE_DATABASE
  );

  return {
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
