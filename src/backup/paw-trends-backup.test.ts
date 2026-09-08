import { describe, expect, it } from "vite-plus/test";

import { createPawTrendsProbeStore } from "@/persistence/paw-trends-probe-store";

import {
  exportPawTrendsBackup,
  previewPawTrendsRestore,
  restorePawTrendsBackup,
} from "./paw-trends-backup";

const createPopulatedPawTrendsStore = async (databaseName: string) => {
  const store = createPawTrendsProbeStore({ databaseName });
  await store.saveSetupRecord({
    dataOwnershipAcknowledged: true,
    dogName: "Mabel",
    labels: {
      Company: ["Orsi"],
      "Dog Symptom": ["Limping"],
      "Owner Symptom": ["Headache"],
      Place: ["Home route"],
      "Training Type": ["Mantrailing"],
      Trigger: ["Dog"],
    },
    storageStatus: "granted",
  });
  await store.saveMoodEntry({
    localDate: "2026-09-07",
    mood: "Playful",
    recordedAt: "2026-09-07T08:00:00.000Z",
    subject: "dog",
  });
  await store.saveDailyCheckIn("2026-09-07", ["Headache"]);
  await store.saveWalk({
    activityMood: "Playful",
    company: ["Orsi"],
    dogSymptoms: ["Limping"],
    durationMinutes: 30,
    localDate: "2026-09-07",
    place: "Home route",
    startedAt: "2026-09-07T09:00:00.000Z",
    triggerEncounters: [
      { id: "encounter-1", reactionSeverity: 2, trigger: "Dog" },
    ],
  });
  return store;
};

describe("Paw Trends backup", () => {
  it("exports every table with versions, relationships, and accurate counts", async () => {
    const store = await createPopulatedPawTrendsStore(
      `paw-trends-export-${crypto.randomUUID()}`
    );

    const backupJson = await exportPawTrendsBackup(store);
    const preview = previewPawTrendsRestore(backupJson);

    expect(preview.dogName).toBe("Mabel");
    expect(preview.recordCounts).toMatchObject({
      dailyCheckIns: 1,
      dogActivities: 1,
      moodEntries: 1,
      setup: 1,
      total: 4,
    });
    expect(preview.backup).toMatchObject({
      backupVersion: 2,
      data: {
        dogActivities: [
          {
            triggerEncounters: [{ reactionSeverity: 2, trigger: "Dog" }],
          },
        ],
        setup: { schemaVersion: 2 },
      },
      product: "Paw Trends",
      schemaVersion: 6,
    });
  });

  it("rejects an incomplete backup before changing current data", async () => {
    const store = await createPopulatedPawTrendsStore(
      `paw-trends-invalid-${crypto.randomUUID()}`
    );
    const before = await store.readDatabaseSnapshot();

    await expect(
      restorePawTrendsBackup(store, '{"product":"Paw Trends"}')
    ).rejects.toThrow("not a complete Paw Trends backup");
    await expect(store.readDatabaseSnapshot()).resolves.toStrictEqual(before);
  });

  it("explains that older backup formats cannot be restored", () => {
    expect(() =>
      previewPawTrendsRestore(
        '{"product":"Paw Trends","version":1,"records":[]}'
      )
    ).toThrow("older format");
  });

  it("replaces all current data from a valid backup", async () => {
    const source = await createPopulatedPawTrendsStore(
      `paw-trends-source-${crypto.randomUUID()}`
    );
    const target = createPawTrendsProbeStore({
      databaseName: `paw-trends-target-${crypto.randomUUID()}`,
    });
    await target.saveSetupRecord({
      dataOwnershipAcknowledged: true,
      dogName: "Replace me",
      labels: {
        Company: [],
        "Dog Symptom": [],
        "Owner Symptom": [],
        Place: [],
        "Training Type": [],
        Trigger: [],
      },
      storageStatus: "browser-managed",
    });

    await restorePawTrendsBackup(target, await exportPawTrendsBackup(source));

    const restored = await target.readDatabaseSnapshot();
    expect(restored.setup?.dogName).toBe("Mabel");
    expect(restored.dailyCheckIns).toHaveLength(1);
    expect(restored.moodEntries).toHaveLength(1);
    expect(restored.dogActivities).toHaveLength(1);
  });

  it("rolls back every table when restore is interrupted", async () => {
    const source = await createPopulatedPawTrendsStore(
      `paw-trends-interrupt-source-${crypto.randomUUID()}`
    );
    const databaseName = `paw-trends-interrupt-target-${crypto.randomUUID()}`;
    const target = await createPopulatedPawTrendsStore(databaseName);
    const before = await target.readDatabaseSnapshot();
    const interruptedTarget = createPawTrendsProbeStore({
      beforeRestoreCommit: () => {
        throw new Error("Simulated interrupted restore");
      },
      databaseName,
    });

    await expect(
      restorePawTrendsBackup(
        interruptedTarget,
        await exportPawTrendsBackup(source)
      )
    ).rejects.toThrow("Simulated interrupted restore");
    await expect(target.readDatabaseSnapshot()).resolves.toStrictEqual(before);
  });

  it("counts new top-level records and resets the count after export", async () => {
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-count-${crypto.randomUUID()}`,
    });
    await store.saveSetupRecord({
      dataOwnershipAcknowledged: true,
      dogName: "Mabel",
      labels: {
        Company: [],
        "Dog Symptom": [],
        "Owner Symptom": [],
        Place: [],
        "Training Type": [],
        Trigger: [],
      },
      storageStatus: "browser-managed",
    });
    await exportPawTrendsBackup(store);

    const moodSaves: Promise<unknown>[] = [];
    for (let index = 0; index < 20; index += 1) {
      moodSaves.push(
        store.saveMoodEntry({
          id: `mood-${index}`,
          localDate: "2026-09-07",
          mood: "Playful",
          recordedAt: new Date(Date.UTC(2026, 8, 7, 0, 0, index)).toISOString(),
          subject: "dog",
        })
      );
    }
    await Promise.all(moodSaves);
    await expect(store.readBackupStatus()).resolves.toMatchObject({
      newTopLevelRecordsSinceExport: 20,
    });

    await exportPawTrendsBackup(store);
    await expect(store.readBackupStatus()).resolves.toMatchObject({
      newTopLevelRecordsSinceExport: 0,
    });
  });
});
