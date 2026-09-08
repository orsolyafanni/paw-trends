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

export interface PawTrendsReusableLabelReference {
  id: string;
  kind: "Daily Check-in" | "Training" | "Walk";
  localDate: string;
}

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
  kind: "walk";
  localDate: string;
  place: string;
  startedAt: string;
  triggerEncounters: PawTrendsTriggerEncounter[];
  updatedAt: string;
}

export interface PawTrendsTraining {
  activityMood: PawTrendsDogMood;
  createdAt: string;
  dogSymptoms: string[];
  id: string;
  kind: "training";
  localDate: string;
  startedAt: string;
  trainingType: string;
  updatedAt: string;
}

export type PawTrendsDogActivity = PawTrendsTraining | PawTrendsWalk;

export type PawTrendsHistoryRecord =
  | { kind: "check-in"; record: PawTrendsDailyCheckIn }
  | { kind: "mood"; record: PawTrendsMoodEntry }
  | { kind: "training"; record: PawTrendsTraining }
  | { kind: "walk"; record: PawTrendsWalk };

export interface PawTrendsBackupStatus {
  id: "backup-status";
  lastSuccessfulExportAt: string | null;
  newTopLevelRecordsSinceExport: number;
  schemaVersion: 1;
}

export interface PawTrendsDatabaseSnapshot {
  backupStatus: PawTrendsBackupStatus;
  dailyCheckIns: PawTrendsDailyCheckIn[];
  dogActivities: PawTrendsDogActivity[];
  moodEntries: PawTrendsMoodEntry[];
  probeRecords: PawTrendsProbeRecord[];
  setup: PawTrendsSetupRecord | null;
}

export type PawTrendsWalkDraft = Omit<
  PawTrendsWalk,
  "createdAt" | "id" | "kind" | "updatedAt"
> & {
  id?: string;
};

export type PawTrendsTrainingDraft = Omit<
  PawTrendsTraining,
  "createdAt" | "id" | "kind" | "updatedAt"
> & { id?: string };

export interface PawTrendsWalkReactionSummary {
  averageSeverity: number;
  peakSeverity: PawTrendsReactionSeverity;
  reactiveEncounters: number;
  totalEncounters: number;
}

export interface PawTrendsProbeStore {
  deleteAllData: () => Promise<void>;
  deleteReusableLabel: (
    category: PawTrendsReusableLabelCategory,
    label: string
  ) => Promise<PawTrendsSetupRecord>;
  deleteDogActivity: (id: string) => Promise<void>;
  deleteWalk: (id: string) => Promise<void>;
  deleteTraining: (id: string) => Promise<void>;
  deleteMoodEntry: (id: string) => Promise<void>;
  deleteHistoryRecord: (entry: PawTrendsHistoryRecord) => Promise<void>;
  listHistoryRecords: () => Promise<PawTrendsHistoryRecord[]>;
  listMoodEntriesForDate: (localDate: string) => Promise<PawTrendsMoodEntry[]>;
  listRecentTriggerLabels: (limit: number) => Promise<string[]>;
  listReusableLabelReferences: (
    category: PawTrendsReusableLabelCategory,
    label: string
  ) => Promise<PawTrendsReusableLabelReference[]>;
  listDogActivitiesForDate: (
    localDate: string
  ) => Promise<PawTrendsDogActivity[]>;
  listTrainingsForDate: (localDate: string) => Promise<PawTrendsTraining[]>;
  listWalksForDate: (localDate: string) => Promise<PawTrendsWalk[]>;
  markSuccessfulBackupExport: (exportedAt: string) => Promise<void>;
  readDailyCheckIn: (
    localDate: string
  ) => Promise<PawTrendsDailyCheckIn | null>;
  readSetupRecord: () => Promise<PawTrendsSetupRecord | null>;
  readSampleRecord: () => Promise<PawTrendsProbeRecord | null>;
  readBackupStatus: () => Promise<PawTrendsBackupStatus>;
  readDatabaseSnapshot: () => Promise<PawTrendsDatabaseSnapshot>;
  replaceDatabaseSnapshot: (
    snapshot: PawTrendsDatabaseSnapshot
  ) => Promise<void>;
  replaceSampleRecord: (record: PawTrendsProbeRecord | null) => Promise<void>;
  saveSetupRecord: (
    setup: Omit<PawTrendsSetupRecord, "completedAt" | "id" | "schemaVersion">
  ) => Promise<PawTrendsSetupRecord>;
  saveDailyCheckIn: (
    localDate: string,
    ownerSymptoms: string[]
  ) => Promise<PawTrendsDailyCheckIn>;
  moveDailyCheckIn: (
    originalLocalDate: string,
    nextLocalDate: string,
    ownerSymptoms: string[]
  ) => Promise<PawTrendsDailyCheckIn>;
  saveMoodEntry: (
    entry: Omit<PawTrendsMoodEntry, "id"> & { id?: string }
  ) => Promise<PawTrendsMoodEntry>;
  saveReusableLabel: (
    category: PawTrendsReusableLabelCategory,
    label: string
  ) => Promise<PawTrendsSetupRecord>;
  renameReusableLabel: (
    category: PawTrendsReusableLabelCategory,
    label: string,
    nextLabel: string
  ) => Promise<PawTrendsSetupRecord>;
  mergeReusableLabels: (
    category: PawTrendsReusableLabelCategory,
    label: string,
    retainedLabel: string
  ) => Promise<PawTrendsSetupRecord>;
  saveSampleRecord: (note: string) => Promise<PawTrendsProbeRecord>;
  saveTraining: (
    training: PawTrendsTrainingDraft
  ) => Promise<PawTrendsTraining>;
  saveWalk: (walk: PawTrendsWalkDraft) => Promise<PawTrendsWalk>;
  restoreHistoryRecord: (entry: PawTrendsHistoryRecord) => Promise<void>;
}

const PAW_TRENDS_SAMPLE_RECORD_ID: PawTrendsProbeRecordId = "owner-sample";
const PAW_TRENDS_SETUP_RECORD_ID: PawTrendsSetupRecord["id"] = "primary-owner";
const PAW_TRENDS_BACKUP_STATUS_ID: PawTrendsBackupStatus["id"] =
  "backup-status";

export const PAW_TRENDS_DATABASE_SCHEMA_VERSION = 6;

const EMPTY_PAW_TRENDS_BACKUP_STATUS: PawTrendsBackupStatus = {
  id: PAW_TRENDS_BACKUP_STATUS_ID,
  lastSuccessfulExportAt: null,
  newTopLevelRecordsSinceExport: 0,
  schemaVersion: 1,
};

class PawTrendsProbeDatabase extends Dexie {
  backupStatus!: Table<PawTrendsBackupStatus, PawTrendsBackupStatus["id"]>;
  dailyCheckIns!: Table<PawTrendsDailyCheckIn, string>;
  dogActivities!: Table<PawTrendsDogActivity, string>;
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
    this.version(5)
      .stores({
        dailyCheckIns: "localDate",
        dogActivities: "id, localDate, startedAt, kind",
        moodEntries: "id, localDate, [subject+recordedAt]",
        records: "id",
        setup: "id",
        walks: null,
      })
      .upgrade(async (transaction) => {
        const existingWalks = await transaction
          .table<PawTrendsWalk>("walks")
          .toArray();
        if (existingWalks.length > 0) {
          await transaction.table("dogActivities").bulkAdd(
            existingWalks.map((walk) => ({
              ...walk,
              kind: "walk" as const,
            }))
          );
        }
      });
    this.version(PAW_TRENDS_DATABASE_SCHEMA_VERSION).stores({
      backupStatus: "id",
      dailyCheckIns: "localDate",
      dogActivities: "id, localDate, startedAt, kind",
      moodEntries: "id, localDate, [subject+recordedAt]",
      records: "id",
      setup: "id",
    });
  }
}

const readPawTrendsBackupStatus = async (
  database: PawTrendsProbeDatabase
): Promise<PawTrendsBackupStatus> =>
  (await database.backupStatus.get(PAW_TRENDS_BACKUP_STATUS_ID)) ??
  EMPTY_PAW_TRENDS_BACKUP_STATUS;

const incrementPawTrendsBackupRecordCount = async (
  database: PawTrendsProbeDatabase
) => {
  const status = await readPawTrendsBackupStatus(database);
  await database.backupStatus.put({
    ...status,
    newTopLevelRecordsSinceExport: status.newTopLevelRecordsSinceExport + 1,
  });
};

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

const rejectPawTrendsActivityFields = (
  activity: object,
  activityName: "Training" | "Walk",
  forbiddenFields: readonly string[]
) => {
  const presentFields = forbiddenFields.filter((field) => field in activity);
  if (presentFields.length > 0) {
    throw new Error(
      `${activityName} cannot include ${activityName === "Training" ? "Walk" : "Training"}-only fields: ${presentFields.join(", ")}.`
    );
  }
};

const requireConfiguredPawTrendsLabel = (
  configuredLabels: readonly string[],
  label: string,
  fieldName: string,
  activityName = "Walk"
) => {
  if (
    !configuredLabels.some(
      (configured) =>
        configured.toLocaleLowerCase() === label.toLocaleLowerCase()
    )
  ) {
    throw new Error(`${activityName} ${fieldName} must use a saved label.`);
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

/** Trims a reusable label and enforces its stored length. */
export const normalizePawTrendsReusableLabel = (
  category: PawTrendsReusableLabelCategory,
  label: string
): string => {
  const normalizedLabel = label.trim();
  if (normalizedLabel.length === 0 || normalizedLabel.length > 80) {
    throw new Error(`${category} label must be between 1 and 80 characters.`);
  }
  return normalizedLabel;
};

const findPawTrendsReusableLabel = (
  labels: readonly string[],
  requestedLabel: string
): string => {
  const savedLabel = labels.find(
    (label) =>
      label.toLocaleLowerCase() === requestedLabel.trim().toLocaleLowerCase()
  );
  if (savedLabel === undefined) {
    throw new Error("Reusable label could not be found.");
  }
  return savedLabel;
};

const requirePawTrendsSetup = async (
  database: PawTrendsProbeDatabase
): Promise<PawTrendsSetupRecord> => {
  const setup = await database.setup.get(PAW_TRENDS_SETUP_RECORD_ID);
  if (!setup) {
    throw new Error("Reusable label cannot be changed before setup.");
  }
  return setup;
};

const replacePawTrendsSetupLabels = (
  setup: PawTrendsSetupRecord,
  category: PawTrendsReusableLabelCategory,
  labels: string[]
): PawTrendsSetupRecord => ({
  ...setup,
  labels: { ...setup.labels, [category]: labels },
});

const hasPawTrendsReusableLabel = (
  labels: readonly string[],
  requestedLabel: string
): boolean =>
  labels.some(
    (label) => label.toLocaleLowerCase() === requestedLabel.toLocaleLowerCase()
  );

const replacePawTrendsLabelInList = (
  labels: readonly string[],
  sourceLabel: string,
  retainedLabel: string
): string[] => {
  const replaced = labels.map((label) =>
    label.toLocaleLowerCase() === sourceLabel.toLocaleLowerCase()
      ? retainedLabel
      : label
  );
  return replaced.filter(
    (label, index) =>
      replaced.findIndex(
        (candidate) =>
          candidate.toLocaleLowerCase() === label.toLocaleLowerCase()
      ) === index
  );
};

const pawTrendsActivityUsesReusableLabel = (
  activity: PawTrendsDogActivity,
  category: PawTrendsReusableLabelCategory,
  label: string
): boolean => {
  if (activity.kind === "training") {
    return (
      (category === "Training Type" &&
        activity.trainingType.toLocaleLowerCase() ===
          label.toLocaleLowerCase()) ||
      (category === "Dog Symptom" &&
        hasPawTrendsReusableLabel(activity.dogSymptoms, label))
    );
  }
  if (category === "Place") {
    return activity.place.toLocaleLowerCase() === label.toLocaleLowerCase();
  }
  if (category === "Company") {
    return hasPawTrendsReusableLabel(activity.company, label);
  }
  if (category === "Dog Symptom") {
    return hasPawTrendsReusableLabel(activity.dogSymptoms, label);
  }
  return (
    category === "Trigger" &&
    activity.triggerEncounters.some(
      (encounter) =>
        encounter.trigger.toLocaleLowerCase() === label.toLocaleLowerCase()
    )
  );
};

const listPawTrendsReusableLabelReferences = async (
  database: PawTrendsProbeDatabase,
  category: PawTrendsReusableLabelCategory,
  label: string
): Promise<PawTrendsReusableLabelReference[]> => {
  const [activities, checkIns] = await Promise.all([
    database.dogActivities.toArray(),
    category === "Owner Symptom" ? database.dailyCheckIns.toArray() : [],
  ]);
  const activityReferences = activities
    .filter((activity) =>
      pawTrendsActivityUsesReusableLabel(activity, category, label)
    )
    .map((activity) => ({
      id: activity.id,
      kind:
        activity.kind === "walk" ? ("Walk" as const) : ("Training" as const),
      localDate: activity.localDate,
    }));
  const checkInReferences = checkIns
    .filter((checkIn) =>
      hasPawTrendsReusableLabel(checkIn.ownerSymptoms, label)
    )
    .map((checkIn) => ({
      id: checkIn.localDate,
      kind: "Daily Check-in" as const,
      localDate: checkIn.localDate,
    }));
  return [...activityReferences, ...checkInReferences].toSorted((left, right) =>
    right.localDate.localeCompare(left.localDate)
  );
};

const replacePawTrendsActivityLabel = (
  activity: PawTrendsDogActivity,
  category: PawTrendsReusableLabelCategory,
  sourceLabel: string,
  retainedLabel: string
): PawTrendsDogActivity => {
  const updatedAt = new Date().toISOString();
  if (activity.kind === "training") {
    return {
      ...activity,
      dogSymptoms:
        category === "Dog Symptom"
          ? replacePawTrendsLabelInList(
              activity.dogSymptoms,
              sourceLabel,
              retainedLabel
            )
          : activity.dogSymptoms,
      trainingType:
        category === "Training Type" &&
        activity.trainingType.toLocaleLowerCase() ===
          sourceLabel.toLocaleLowerCase()
          ? retainedLabel
          : activity.trainingType,
      updatedAt,
    };
  }
  return {
    ...activity,
    company:
      category === "Company"
        ? replacePawTrendsLabelInList(
            activity.company,
            sourceLabel,
            retainedLabel
          )
        : activity.company,
    dogSymptoms:
      category === "Dog Symptom"
        ? replacePawTrendsLabelInList(
            activity.dogSymptoms,
            sourceLabel,
            retainedLabel
          )
        : activity.dogSymptoms,
    place:
      category === "Place" &&
      activity.place.toLocaleLowerCase() === sourceLabel.toLocaleLowerCase()
        ? retainedLabel
        : activity.place,
    triggerEncounters:
      category === "Trigger"
        ? activity.triggerEncounters.map((encounter) => ({
            ...encounter,
            trigger:
              encounter.trigger.toLocaleLowerCase() ===
              sourceLabel.toLocaleLowerCase()
                ? retainedLabel
                : encounter.trigger,
          }))
        : activity.triggerEncounters,
    updatedAt,
  };
};

interface PawTrendsReusableLabelUpdate {
  beforeCommit?: () => Promise<void> | void;
  category: PawTrendsReusableLabelCategory;
  label: string;
  nextLabel: string;
  operation: "merge" | "rename";
}

const updatePawTrendsReusableLabel = async (
  database: PawTrendsProbeDatabase,
  update: PawTrendsReusableLabelUpdate
): Promise<PawTrendsSetupRecord> =>
  await database.transaction(
    "rw",
    database.setup,
    database.dogActivities,
    database.dailyCheckIns,
    async () => {
      const setup = await requirePawTrendsSetup(database);
      const sourceLabel = findPawTrendsReusableLabel(
        setup.labels[update.category],
        update.label
      );
      const normalizedNextLabel = normalizePawTrendsReusableLabel(
        update.category,
        update.nextLabel
      );
      const existingNextLabel = setup.labels[update.category].find(
        (label) =>
          label !== sourceLabel &&
          label.toLocaleLowerCase() === normalizedNextLabel.toLocaleLowerCase()
      );
      if (update.operation === "rename" && existingNextLabel !== undefined) {
        throw new Error(
          `${update.category} already has a label named ${existingNextLabel}.`
        );
      }
      if (update.operation === "merge" && existingNextLabel === undefined) {
        throw new Error("Choose another saved label to retain.");
      }
      const retainedLabel = existingNextLabel ?? normalizedNextLabel;
      const activities = await database.dogActivities.toArray();
      const changedActivities = activities
        .filter((activity) =>
          pawTrendsActivityUsesReusableLabel(
            activity,
            update.category,
            sourceLabel
          )
        )
        .map((activity) =>
          replacePawTrendsActivityLabel(
            activity,
            update.category,
            sourceLabel,
            retainedLabel
          )
        );
      if (changedActivities.length > 0) {
        await database.dogActivities.bulkPut(changedActivities);
      }
      if (update.category === "Owner Symptom") {
        const checkIns = await database.dailyCheckIns.toArray();
        const changedCheckIns = checkIns
          .filter((checkIn) =>
            hasPawTrendsReusableLabel(checkIn.ownerSymptoms, sourceLabel)
          )
          .map((checkIn) => ({
            ...checkIn,
            ownerSymptoms: replacePawTrendsLabelInList(
              checkIn.ownerSymptoms,
              sourceLabel,
              retainedLabel
            ),
            updatedAt: new Date().toISOString(),
          }));
        if (changedCheckIns.length > 0) {
          await database.dailyCheckIns.bulkPut(changedCheckIns);
        }
      }
      await update.beforeCommit?.();
      const nextLabels = [
        ...setup.labels[update.category].filter(
          (label) => label !== sourceLabel && label !== existingNextLabel
        ),
        retainedLabel,
      ];
      const updatedSetup = replacePawTrendsSetupLabels(
        setup,
        update.category,
        nextLabels
      );
      await database.setup.put(updatedSetup);
      return updatedSetup;
    }
  );

/** Creates the device-local store for setup and the original proof record. */
export const createPawTrendsProbeStore = (_options?: {
  databaseName?: string;
  beforeRestoreCommit?: () => Promise<void> | void;
  beforeReusableLabelCommit?: () => Promise<void> | void;
}): PawTrendsProbeStore => {
  const database = new PawTrendsProbeDatabase(
    _options?.databaseName ?? PAW_TRENDS_PROBE_DATABASE
  );

  return {
    deleteAllData: async () => {
      await database.transaction(
        "rw",
        [
          database.backupStatus,
          database.dailyCheckIns,
          database.dogActivities,
          database.moodEntries,
          database.records,
          database.setup,
        ],
        async () => {
          await Promise.all([
            database.backupStatus.clear(),
            database.dailyCheckIns.clear(),
            database.dogActivities.clear(),
            database.moodEntries.clear(),
            database.records.clear(),
            database.setup.clear(),
          ]);
        }
      );
    },
    deleteReusableLabel: async (category, label) => {
      const setup = await requirePawTrendsSetup(database);
      const savedLabel = findPawTrendsReusableLabel(
        setup.labels[category],
        label
      );
      const references = await listPawTrendsReusableLabelReferences(
        database,
        category,
        savedLabel
      );
      if (references.length > 0) {
        throw new Error(
          `${category} label is used by ${references.length} historical ${references.length === 1 ? "record" : "records"}. Rename or merge it instead.`
        );
      }
      const updatedSetup = replacePawTrendsSetupLabels(
        setup,
        category,
        setup.labels[category].filter((candidate) => candidate !== savedLabel)
      );
      await database.setup.put(updatedSetup);
      return updatedSetup;
    },
    deleteDogActivity: async (id) => {
      await database.dogActivities.delete(id);
    },
    deleteTraining: async (id) => {
      await database.dogActivities.delete(id);
    },
    deleteWalk: async (id) => {
      await database.dogActivities.delete(id);
    },
    deleteMoodEntry: async (id) => {
      await database.moodEntries.delete(id);
    },
    deleteHistoryRecord: async (entry) => {
      if (entry.kind === "check-in") {
        await database.dailyCheckIns.delete(entry.record.localDate);
      } else if (entry.kind === "mood") {
        await database.moodEntries.delete(entry.record.id);
      } else {
        await database.dogActivities.delete(entry.record.id);
      }
    },
    listHistoryRecords: async () => {
      const [dailyCheckIns, moodEntries, dogActivities] = await Promise.all([
        database.dailyCheckIns.toArray(),
        database.moodEntries.toArray(),
        database.dogActivities.toArray(),
      ]);
      return [
        ...dailyCheckIns.map((record) => ({
          kind: "check-in" as const,
          record,
        })),
        ...moodEntries.map((record) => ({ kind: "mood" as const, record })),
        ...dogActivities.map(
          (record): PawTrendsHistoryRecord =>
            record.kind === "walk"
              ? { kind: "walk", record }
              : { kind: "training", record }
        ),
      ];
    },
    listMoodEntriesForDate: async (localDate) =>
      await database.moodEntries
        .where("localDate")
        .equals(localDate)
        .sortBy("recordedAt"),
    listRecentTriggerLabels: async (limit) => {
      const savedActivities = await database.dogActivities
        .where("kind")
        .equals("walk")
        .sortBy("startedAt");
      const walks = savedActivities
        .filter(
          (activity): activity is PawTrendsWalk => activity.kind === "walk"
        )
        .toReversed();
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
    listReusableLabelReferences: async (category, label) =>
      await listPawTrendsReusableLabelReferences(database, category, label),
    listDogActivitiesForDate: async (localDate) =>
      await database.dogActivities
        .where("localDate")
        .equals(localDate)
        .sortBy("startedAt"),
    listTrainingsForDate: async (localDate) => {
      const activities = await database.dogActivities
        .where("localDate")
        .equals(localDate)
        .sortBy("startedAt");
      return activities.filter(
        (activity): activity is PawTrendsTraining =>
          activity.kind === "training"
      );
    },
    listWalksForDate: async (localDate) => {
      const activities = await database.dogActivities
        .where("localDate")
        .equals(localDate)
        .sortBy("startedAt");
      return activities.filter(
        (activity): activity is PawTrendsWalk => activity.kind === "walk"
      );
    },
    markSuccessfulBackupExport: async (exportedAt) => {
      await database.backupStatus.put({
        id: PAW_TRENDS_BACKUP_STATUS_ID,
        lastSuccessfulExportAt: exportedAt,
        newTopLevelRecordsSinceExport: 0,
        schemaVersion: 1,
      });
    },
    readDailyCheckIn: async (localDate) =>
      (await database.dailyCheckIns.get(localDate)) ?? null,
    readSetupRecord: async () =>
      (await database.setup.get(PAW_TRENDS_SETUP_RECORD_ID)) ?? null,
    readSampleRecord: async () =>
      (await database.records.get(PAW_TRENDS_SAMPLE_RECORD_ID)) ?? null,
    readBackupStatus: async () => await readPawTrendsBackupStatus(database),
    readDatabaseSnapshot: async () => {
      const [
        backupStatus,
        dailyCheckIns,
        dogActivities,
        moodEntries,
        probeRecords,
        setup,
      ] = await Promise.all([
        readPawTrendsBackupStatus(database),
        database.dailyCheckIns.toArray(),
        database.dogActivities.toArray(),
        database.moodEntries.toArray(),
        database.records.toArray(),
        database.setup.get(PAW_TRENDS_SETUP_RECORD_ID),
      ]);
      return {
        backupStatus,
        dailyCheckIns,
        dogActivities,
        moodEntries,
        probeRecords,
        setup: setup ?? null,
      };
    },
    replaceDatabaseSnapshot: async (snapshot) => {
      await database.transaction(
        "rw",
        [
          database.backupStatus,
          database.dailyCheckIns,
          database.dogActivities,
          database.moodEntries,
          database.records,
          database.setup,
        ],
        async () => {
          await Promise.all([
            database.backupStatus.clear(),
            database.dailyCheckIns.clear(),
            database.dogActivities.clear(),
            database.moodEntries.clear(),
            database.records.clear(),
            database.setup.clear(),
          ]);
          await Promise.all([
            database.backupStatus.put(snapshot.backupStatus),
            database.dailyCheckIns.bulkPut(snapshot.dailyCheckIns),
            database.dogActivities.bulkPut(snapshot.dogActivities),
            database.moodEntries.bulkPut(snapshot.moodEntries),
            database.records.bulkPut(snapshot.probeRecords),
            snapshot.setup === null
              ? Promise.resolve()
              : database.setup.put(snapshot.setup),
          ]);
          await _options?.beforeRestoreCommit?.();
        }
      );
    },
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
      const existing = await database.setup.get(PAW_TRENDS_SETUP_RECORD_ID);
      await database.transaction(
        "rw",
        database.setup,
        database.backupStatus,
        async () => {
          await database.setup.put(setupRecord);
          if (existing === undefined) {
            await incrementPawTrendsBackupRecordCount(database);
          }
        }
      );
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
      await database.transaction(
        "rw",
        database.dailyCheckIns,
        database.backupStatus,
        async () => {
          await database.dailyCheckIns.put(checkIn);
          if (existing === undefined) {
            await incrementPawTrendsBackupRecordCount(database);
          }
        }
      );
      return checkIn;
    },
    moveDailyCheckIn: async (
      originalLocalDate,
      nextLocalDate,
      ownerSymptoms
    ) => {
      const existing = await database.dailyCheckIns.get(originalLocalDate);
      if (!existing) {
        throw new Error("Daily Check-in could not be found for editing.");
      }
      const conflicting = await database.dailyCheckIns.get(nextLocalDate);
      if (conflicting && nextLocalDate !== originalLocalDate) {
        throw new Error("Daily Check-in already exists for this date.");
      }
      const updatedCheckIn: PawTrendsDailyCheckIn = {
        completedAt: existing.completedAt,
        localDate: nextLocalDate,
        ownerSymptoms: [...new Set(ownerSymptoms)].toSorted(),
        updatedAt: new Date().toISOString(),
      };
      await database.transaction("rw", database.dailyCheckIns, async () => {
        if (originalLocalDate !== nextLocalDate) {
          await database.dailyCheckIns.delete(originalLocalDate);
        }
        await database.dailyCheckIns.put(updatedCheckIn);
      });
      return updatedCheckIn;
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
      const existing = await database.moodEntries.get(savedEntry.id);
      await database.transaction(
        "rw",
        database.moodEntries,
        database.backupStatus,
        async () => {
          await database.moodEntries.put(savedEntry);
          if (existing === undefined) {
            await incrementPawTrendsBackupRecordCount(database);
          }
        }
      );
      return savedEntry;
    },
    saveReusableLabel: async (category, label) => {
      const normalizedLabel = normalizePawTrendsReusableLabel(category, label);
      const setup = await requirePawTrendsSetup(database);
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
    renameReusableLabel: async (category, label, nextLabel) =>
      await updatePawTrendsReusableLabel(database, {
        beforeCommit: _options?.beforeReusableLabelCommit,
        category,
        label,
        nextLabel,
        operation: "rename",
      }),
    mergeReusableLabels: async (category, label, retainedLabel) =>
      await updatePawTrendsReusableLabel(database, {
        beforeCommit: _options?.beforeReusableLabelCommit,
        category,
        label,
        nextLabel: retainedLabel,
        operation: "merge",
      }),
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
    saveTraining: async (training) => {
      rejectPawTrendsActivityFields(training, "Training", [
        "company",
        "durationMinutes",
        "place",
        "triggerEncounters",
      ]);
      const setup = await database.setup.get(PAW_TRENDS_SETUP_RECORD_ID);
      if (!setup) {
        throw new Error("Training cannot be saved before setup.");
      }
      const startedAt = new Date(training.startedAt);
      if (
        Number.isNaN(startedAt.getTime()) ||
        getPawTrendsLocalDate(startedAt) !== training.localDate
      ) {
        throw new Error("Training date and time must be valid and agree.");
      }
      if (!PAW_TRENDS_DOG_MOODS.includes(training.activityMood)) {
        throw new Error("Training requires an Activity Mood confirmation.");
      }
      const trainingType = training.trainingType.trim();
      if (!trainingType) {
        throw new Error("Training requires one Training Type.");
      }
      requireConfiguredPawTrendsLabel(
        setup.labels["Training Type"],
        trainingType,
        "Training Type",
        "Training"
      );
      const dogSymptoms = normalizePawTrendsWalkLabels(training.dogSymptoms);
      for (const label of dogSymptoms) {
        requireConfiguredPawTrendsLabel(
          setup.labels["Dog Symptom"],
          label,
          "Dog Symptom",
          "Training"
        );
      }
      const existing =
        training.id === undefined
          ? undefined
          : await database.dogActivities.get(training.id);
      if (existing !== undefined && existing.kind !== "training") {
        throw new Error("Training cannot replace a saved Walk.");
      }
      const now = new Date().toISOString();
      const savedTraining: PawTrendsTraining = {
        ...training,
        createdAt: existing?.createdAt ?? now,
        dogSymptoms,
        id: training.id ?? crypto.randomUUID(),
        kind: "training",
        trainingType,
        updatedAt: now,
      };
      await database.transaction(
        "rw",
        database.dogActivities,
        database.backupStatus,
        async () => {
          await database.dogActivities.put(savedTraining);
          if (existing === undefined) {
            await incrementPawTrendsBackupRecordCount(database);
          }
        }
      );
      return savedTraining;
    },
    // oxlint-disable-next-line eslint/complexity -- Validation keeps corrupt Walk data out of IndexedDB.
    saveWalk: async (walk) => {
      rejectPawTrendsActivityFields(walk, "Walk", ["trainingType"]);
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
        walk.id === undefined
          ? undefined
          : await database.dogActivities.get(walk.id);
      if (existing !== undefined && existing.kind !== "walk") {
        throw new Error("Walk cannot replace a saved Training.");
      }
      const now = new Date().toISOString();
      const savedWalk: PawTrendsWalk = {
        ...walk,
        company,
        createdAt: existing?.createdAt ?? now,
        dogSymptoms,
        id: walk.id ?? crypto.randomUUID(),
        kind: "walk",
        place,
        triggerEncounters: walk.triggerEncounters.map((encounter) => ({
          ...encounter,
          trigger: encounter.trigger.trim(),
        })),
        updatedAt: now,
      };
      await database.transaction(
        "rw",
        database.dogActivities,
        database.backupStatus,
        async () => {
          await database.dogActivities.put(savedWalk);
          if (existing === undefined) {
            await incrementPawTrendsBackupRecordCount(database);
          }
        }
      );
      return savedWalk;
    },
    restoreHistoryRecord: async (entry) => {
      if (entry.kind === "check-in") {
        await database.dailyCheckIns.put(entry.record);
      } else if (entry.kind === "mood") {
        await database.moodEntries.put(entry.record);
      } else {
        await database.dogActivities.put(entry.record);
      }
    },
  };
};
