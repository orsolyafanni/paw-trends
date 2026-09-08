/* oxlint-disable no-use-before-define -- The complete schema composes validators declared below it. */

import { z } from "zod";

import type {
  PawTrendsDatabaseSnapshot,
  PawTrendsProbeStore,
} from "@/persistence/paw-trends-probe-store";
import {
  PAW_TRENDS_DATABASE_SCHEMA_VERSION,
  PAW_TRENDS_DOG_MOODS,
  PAW_TRENDS_OWNER_MOODS,
} from "@/persistence/paw-trends-probe-store";

export const PAW_TRENDS_BACKUP_VERSION = 2;

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const dateTimeSchema = z.iso.datetime();
const dogMoodSchema = z.enum(PAW_TRENDS_DOG_MOODS);
const ownerMoodSchema = z.enum(PAW_TRENDS_OWNER_MOODS);
const reusableLabelsSchema = z.strictObject({
  Company: z.array(z.string()),
  "Dog Symptom": z.array(z.string()),
  "Owner Symptom": z.array(z.string()),
  Place: z.array(z.string()),
  "Training Type": z.array(z.string()),
  Trigger: z.array(z.string()),
});
const setupRecordSchema = z.strictObject({
  completedAt: dateTimeSchema,
  dataOwnershipAcknowledged: z.literal(true),
  dogName: z.string().min(1),
  id: z.literal("primary-owner"),
  labels: reusableLabelsSchema,
  schemaVersion: z.literal(2),
  storageStatus: z.enum(["browser-managed", "granted"]),
});
const probeRecordSchema = z.strictObject({
  id: z.literal("owner-sample"),
  note: z.string(),
  savedAt: dateTimeSchema,
  schemaVersion: z.literal(1),
});
const moodEntrySchema = z.strictObject({
  id: z.string().min(1),
  localDate: localDateSchema,
  mood: z.union([dogMoodSchema, ownerMoodSchema]),
  notes: z.string().optional(),
  recordedAt: dateTimeSchema,
  subject: z.enum(["dog", "owner"]),
});
const dailyCheckInSchema = z.strictObject({
  completedAt: dateTimeSchema,
  localDate: localDateSchema,
  ownerSymptoms: z.array(z.string()),
  updatedAt: dateTimeSchema,
});
const triggerEncounterSchema = z.strictObject({
  id: z.string().min(1),
  reactionSeverity: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  trigger: z.string().min(1),
});
const walkSchema = z.strictObject({
  activityMood: dogMoodSchema,
  company: z.array(z.string()),
  createdAt: dateTimeSchema,
  dogSymptoms: z.array(z.string()),
  durationMinutes: z.number().int().positive(),
  id: z.string().min(1),
  kind: z.literal("walk"),
  localDate: localDateSchema,
  place: z.string().min(1),
  startedAt: dateTimeSchema,
  triggerEncounters: z.array(triggerEncounterSchema),
  updatedAt: dateTimeSchema,
});
const trainingSchema = z.strictObject({
  activityMood: dogMoodSchema,
  createdAt: dateTimeSchema,
  dogSymptoms: z.array(z.string()),
  id: z.string().min(1),
  kind: z.literal("training"),
  localDate: localDateSchema,
  startedAt: dateTimeSchema,
  trainingType: z.string().min(1),
  updatedAt: dateTimeSchema,
});
const backupStatusSchema = z.strictObject({
  id: z.literal("backup-status"),
  lastSuccessfulExportAt: dateTimeSchema.nullable(),
  newTopLevelRecordsSinceExport: z.number().int().nonnegative(),
  schemaVersion: z.literal(1),
});
const databaseSnapshotSchema = z.strictObject({
  backupStatus: backupStatusSchema,
  dailyCheckIns: z.array(dailyCheckInSchema),
  dogActivities: z.array(
    z.discriminatedUnion("kind", [walkSchema, trainingSchema])
  ),
  moodEntries: z.array(moodEntrySchema),
  probeRecords: z.array(probeRecordSchema).max(1),
  setup: setupRecordSchema.nullable(),
});
const backupRecordCountsSchema = z.strictObject({
  dailyCheckIns: z.number().int().nonnegative(),
  dogActivities: z.number().int().nonnegative(),
  moodEntries: z.number().int().nonnegative(),
  probeRecords: z.number().int().nonnegative(),
  setup: z.number().int().min(0).max(1),
  total: z.number().int().nonnegative(),
});

const pawTrendsBackupSchema = z
  .strictObject({
    backupVersion: z.literal(PAW_TRENDS_BACKUP_VERSION),
    data: databaseSnapshotSchema,
    exportedAt: dateTimeSchema,
    product: z.literal("Paw Trends"),
    recordCounts: backupRecordCountsSchema,
    schemaVersion: z.literal(PAW_TRENDS_DATABASE_SCHEMA_VERSION),
  })
  .superRefine((backup, context) => {
    const expectedCounts = countPawTrendsBackupRecords(backup.data);
    if (
      JSON.stringify(backup.recordCounts) !== JSON.stringify(expectedCounts)
    ) {
      context.addIssue({
        code: "custom",
        message: "Backup record counts do not match its data.",
        path: ["recordCounts"],
      });
    }
    validatePawTrendsBackupRelationships(backup.data, context);
  });

export type PawTrendsBackup = z.infer<typeof pawTrendsBackupSchema>;
export type PawTrendsBackupRecordCounts = PawTrendsBackup["recordCounts"];

export interface PawTrendsRestorePreview {
  backup: PawTrendsBackup;
  dogName: string;
  exportedAt: string;
  recordCounts: PawTrendsBackupRecordCounts;
}

const hasLabel = (labels: readonly string[], requested: string) =>
  labels.some(
    (label) => label.toLocaleLowerCase() === requested.toLocaleLowerCase()
  );

const validatePawTrendsBackupRelationships = (
  snapshot: PawTrendsDatabaseSnapshot,
  context: z.RefinementCtx
) => {
  const hasDependentRecords =
    snapshot.dailyCheckIns.length > 0 ||
    snapshot.dogActivities.length > 0 ||
    snapshot.moodEntries.length > 0;
  if (hasDependentRecords && snapshot.setup === null) {
    context.addIssue({
      code: "custom",
      message: "Backup records require an Owner and Dog setup record.",
      path: ["data", "setup"],
    });
    return;
  }
  if (snapshot.setup === null) {
    return;
  }

  const { labels } = snapshot.setup;
  const invalidReference =
    snapshot.dailyCheckIns.some((checkIn) =>
      checkIn.ownerSymptoms.some(
        (label) => !hasLabel(labels["Owner Symptom"], label)
      )
    ) ||
    snapshot.dogActivities.some((activity) => {
      if (activity.kind === "training") {
        return (
          !hasLabel(labels["Training Type"], activity.trainingType) ||
          activity.dogSymptoms.some(
            (label) => !hasLabel(labels["Dog Symptom"], label)
          )
        );
      }
      return (
        !hasLabel(labels.Place, activity.place) ||
        activity.company.some((label) => !hasLabel(labels.Company, label)) ||
        activity.dogSymptoms.some(
          (label) => !hasLabel(labels["Dog Symptom"], label)
        ) ||
        activity.triggerEncounters.some(
          (encounter) => !hasLabel(labels.Trigger, encounter.trigger)
        )
      );
    });
  if (invalidReference) {
    context.addIssue({
      code: "custom",
      message: "A record refers to a reusable label missing from setup.",
      path: ["data"],
    });
  }
};

/** Counts each top-level database record included in a backup. */
export function countPawTrendsBackupRecords(
  snapshot: PawTrendsDatabaseSnapshot
): PawTrendsBackupRecordCounts {
  const setup = snapshot.setup === null ? 0 : 1;
  const counts = {
    dailyCheckIns: snapshot.dailyCheckIns.length,
    dogActivities: snapshot.dogActivities.length,
    moodEntries: snapshot.moodEntries.length,
    probeRecords: snapshot.probeRecords.length,
    setup,
  };
  return {
    ...counts,
    total: Object.values(counts).reduce((total, count) => total + count, 0),
  };
}

/** Serializes every local Paw Trends table into a dated, versioned backup. */
export async function exportPawTrendsBackup(
  store: PawTrendsProbeStore
): Promise<string> {
  const exportedAt = new Date().toISOString();
  const snapshot = await store.readDatabaseSnapshot();
  const exportedSnapshot: PawTrendsDatabaseSnapshot = {
    ...snapshot,
    backupStatus: {
      ...snapshot.backupStatus,
      lastSuccessfulExportAt: exportedAt,
      newTopLevelRecordsSinceExport: 0,
    },
  };
  const backup: PawTrendsBackup = {
    backupVersion: PAW_TRENDS_BACKUP_VERSION,
    data: exportedSnapshot,
    exportedAt,
    product: "Paw Trends",
    recordCounts: countPawTrendsBackupRecords(exportedSnapshot),
    schemaVersion: PAW_TRENDS_DATABASE_SCHEMA_VERSION,
  };
  const backupJson = JSON.stringify(backup, null, 2);
  await store.markSuccessfulBackupExport(exportedAt);
  return backupJson;
}

/** Validates a complete backup and returns the details needed for restore confirmation. */
export function previewPawTrendsRestore(
  backupJson: string
): PawTrendsRestorePreview {
  let unknownBackup: unknown;
  try {
    unknownBackup = JSON.parse(backupJson);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (
    typeof unknownBackup === "object" &&
    unknownBackup !== null &&
    (("version" in unknownBackup && unknownBackup.version === 1) ||
      ("backupVersion" in unknownBackup && unknownBackup.backupVersion === 1))
  ) {
    throw new Error(
      "This backup uses an older format that this version of Paw Trends cannot restore."
    );
  }

  const parsedBackup = pawTrendsBackupSchema.safeParse(unknownBackup);
  if (!parsedBackup.success) {
    throw new Error("This file is not a complete Paw Trends backup.");
  }
  return {
    backup: parsedBackup.data,
    dogName: parsedBackup.data.data.setup?.dogName ?? "No Dog configured",
    exportedAt: parsedBackup.data.exportedAt,
    recordCounts: parsedBackup.data.recordCounts,
  };
}

/** Revalidates and atomically replaces every local table from a backup. */
export async function restorePawTrendsBackup(
  store: PawTrendsProbeStore,
  backupJson: string
): Promise<PawTrendsDatabaseSnapshot> {
  const preview = previewPawTrendsRestore(backupJson);
  await store.replaceDatabaseSnapshot(preview.backup.data);
  return preview.backup.data;
}
