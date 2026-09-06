import { z } from "zod";

import type {
  PawTrendsProbeRecord,
  PawTrendsProbeStore,
} from "@/persistence/paw-trends-probe-store";

const pawTrendsProbeRecordSchema = z.strictObject({
  id: z.literal("owner-sample"),
  note: z.string(),
  savedAt: z.iso.datetime(),
  schemaVersion: z.literal(1),
});

const pawTrendsBackupSchema = z.strictObject({
  exportedAt: z.iso.datetime(),
  product: z.literal("Paw Trends"),
  records: z.array(pawTrendsProbeRecordSchema).max(1),
  version: z.literal(1),
});

export interface PawTrendsBackup {
  product: "Paw Trends";
  version: 1;
  exportedAt: string;
  records: PawTrendsProbeRecord[];
}

/** Serializes the complete local proof record into a portable JSON backup. */
export async function exportPawTrendsBackup(
  store: PawTrendsProbeStore
): Promise<string> {
  const record = await store.readSampleRecord();
  const backup: PawTrendsBackup = {
    exportedAt: new Date().toISOString(),
    product: "Paw Trends",
    records: record ? [record] : [],
    version: 1,
  };

  return JSON.stringify(backup, null, 2);
}

/** Validates and replaces local proof data from a Paw Trends JSON backup. */
export async function restorePawTrendsBackup(
  store: PawTrendsProbeStore,
  backupJson: string
): Promise<PawTrendsProbeRecord | null> {
  let unknownBackup: unknown;
  try {
    unknownBackup = JSON.parse(backupJson);
  } catch {
    throw new Error("This file is not a valid Paw Trends backup.");
  }

  const parsedBackup = pawTrendsBackupSchema.safeParse(unknownBackup);
  if (!parsedBackup.success) {
    throw new Error("This file is not a valid Paw Trends backup.");
  }

  const [parsedRecord] = parsedBackup.data.records;
  const record: PawTrendsProbeRecord | null = parsedRecord ?? null;
  await store.replaceSampleRecord(record);
  return record;
}
