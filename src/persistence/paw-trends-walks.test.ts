import { Dexie } from "dexie";
import { describe, expect, it } from "vite-plus/test";

import {
  calculatePawTrendsWalkReactionSummary,
  createPawTrendsProbeStore,
  PAW_TRENDS_SEEDED_REUSABLE_LABELS,
} from "./paw-trends-probe-store";
import type { PawTrendsTriggerEncounter } from "./paw-trends-probe-store";

const createWalkStore = async () => {
  const store = createPawTrendsProbeStore({
    databaseName: `paw-trends-walks-${crypto.randomUUID()}`,
  });
  await store.saveSetupRecord({
    dataOwnershipAcknowledged: true,
    dogName: "Mabel",
    labels: structuredClone(PAW_TRENDS_SEEDED_REUSABLE_LABELS),
    storageStatus: "browser-managed",
  });
  return store;
};

describe("Paw Trends Walks", () => {
  it("migrates existing Walks into the Dog Activity store", async () => {
    const databaseName = `paw-trends-walk-migration-${crypto.randomUUID()}`;
    const legacyDatabase = new Dexie(databaseName);
    legacyDatabase.version(4).stores({
      dailyCheckIns: "localDate",
      moodEntries: "id, localDate, [subject+recordedAt]",
      records: "id",
      setup: "id",
      walks: "id, localDate, startedAt",
    });
    await legacyDatabase.table("setup").put({
      completedAt: new Date().toISOString(),
      dataOwnershipAcknowledged: true,
      dogName: "Mabel",
      id: "primary-owner",
      labels: structuredClone(PAW_TRENDS_SEEDED_REUSABLE_LABELS),
      schemaVersion: 2,
      storageStatus: "browser-managed",
    });
    await legacyDatabase.table("walks").put({
      activityMood: "Playful",
      company: [],
      createdAt: new Date().toISOString(),
      dogSymptoms: [],
      durationMinutes: 30,
      id: "legacy-walk",
      localDate: "2026-09-07",
      place: "Home route",
      startedAt: new Date(2026, 8, 7, 8).toISOString(),
      triggerEncounters: [],
      updatedAt: new Date().toISOString(),
    });
    legacyDatabase.close();

    const store = createPawTrendsProbeStore({ databaseName });
    const walks = await store.listWalksForDate("2026-09-07");

    expect(walks).toHaveLength(1);
    expect(walks[0]).toMatchObject({ id: "legacy-walk", kind: "walk" });
  });

  it("stores empty context and repeated Trigger Encounters at every severity boundary", async () => {
    const store = await createWalkStore();
    const severities = [0, 1, 2, 3, 4, 5] as const;
    const triggerEncounters = severities.map((reactionSeverity, index) => ({
      id: `encounter-${index}`,
      reactionSeverity,
      trigger: "Dog",
    }));
    const walk = await store.saveWalk({
      activityMood: "Playful",
      company: [],
      dogSymptoms: [],
      durationMinutes: 45,
      localDate: "2026-09-07",
      place: "Home route",
      startedAt: new Date(2026, 8, 7, 8, 30).toISOString(),
      triggerEncounters,
    });

    await expect(store.listWalksForDate("2026-09-07")).resolves.toStrictEqual([
      walk,
    ]);
    expect(
      calculatePawTrendsWalkReactionSummary(triggerEncounters)
    ).toStrictEqual({
      averageSeverity: 2.5,
      peakSeverity: 5,
      reactiveEncounters: 5,
      totalEncounters: 6,
    });
    await expect(store.listRecentTriggerLabels(3)).resolves.toStrictEqual([
      "Dog",
    ]);

    const edited = await store.saveWalk({
      ...walk,
      durationMinutes: 50,
      triggerEncounters: [],
    });
    expect(edited.createdAt).toBe(walk.createdAt);
    expect(
      calculatePawTrendsWalkReactionSummary(edited.triggerEncounters)
    ).toStrictEqual({
      averageSeverity: 0,
      peakSeverity: 0,
      reactiveEncounters: 0,
      totalEncounters: 0,
    });
  });

  it("rejects incomplete Walks and invalid Trigger Encounter combinations", async () => {
    const store = await createWalkStore();
    const validWalk = {
      activityMood: "Tense" as const,
      company: [],
      dogSymptoms: [],
      durationMinutes: 20,
      localDate: "2026-09-07",
      place: "Lake11",
      startedAt: new Date(2026, 8, 7, 18).toISOString(),
      triggerEncounters: [] as PawTrendsTriggerEncounter[],
    };

    await expect(
      store.saveWalk({ ...validWalk, durationMinutes: 0 })
    ).rejects.toThrow("positive whole number");
    await expect(
      store.saveWalk({ ...validWalk, durationMinutes: 1.5 })
    ).rejects.toThrow("positive whole number");
    await expect(store.saveWalk({ ...validWalk, place: "" })).rejects.toThrow(
      "requires one Place"
    );
    await expect(
      store.saveWalk({
        ...validWalk,
        triggerEncounters: [
          {
            id: "bad-severity",
            // @ts-expect-error Verifies the store rejects corrupt runtime data.
            reactionSeverity: 6,
            trigger: "Dog",
          },
        ],
      })
    ).rejects.toThrow("0 through 5");
    await expect(
      store.saveWalk({
        ...validWalk,
        triggerEncounters: [
          { id: "missing-trigger", reactionSeverity: 0, trigger: "" },
        ],
      })
    ).rejects.toThrow("must use a saved label");
  });

  it("creates valid reusable labels inline without case-insensitive duplicates", async () => {
    const store = await createWalkStore();
    const withBike = await store.saveReusableLabel("Trigger", "Bike");
    expect(withBike.labels.Trigger).toContain("Bike");
    const duplicate = await store.saveReusableLabel("Trigger", " bike ");
    expect(
      duplicate.labels.Trigger.filter((label) => label.toLowerCase() === "bike")
    ).toHaveLength(1);
    await expect(store.saveReusableLabel("Place", " ")).rejects.toThrow(
      "between 1 and 80 characters"
    );
  });
});
