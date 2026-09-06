import { Dexie } from "dexie";
import type { Table } from "dexie";

const PAW_TRENDS_PROBE_DATABASE = "paw-trends-local";

export type PawTrendsProbeRecordId = "owner-sample";

export interface PawTrendsProbeRecord {
  id: PawTrendsProbeRecordId;
  note: string;
  savedAt: string;
  schemaVersion: 1;
}

export interface PawTrendsProbeStore {
  readSampleRecord: () => Promise<PawTrendsProbeRecord | null>;
  replaceSampleRecord: (record: PawTrendsProbeRecord | null) => Promise<void>;
  saveSampleRecord: (note: string) => Promise<PawTrendsProbeRecord>;
}

const PAW_TRENDS_SAMPLE_RECORD_ID: PawTrendsProbeRecordId = "owner-sample";

class PawTrendsProbeDatabase extends Dexie {
  records!: Table<PawTrendsProbeRecord, PawTrendsProbeRecordId>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(1).stores({ records: "id" });
  }
}

/** Creates the device-local record service used by the persistence proof UI. */
export const createPawTrendsProbeStore = (_options?: {
  databaseName?: string;
}): PawTrendsProbeStore => {
  const database = new PawTrendsProbeDatabase(
    _options?.databaseName ?? PAW_TRENDS_PROBE_DATABASE
  );

  return {
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
