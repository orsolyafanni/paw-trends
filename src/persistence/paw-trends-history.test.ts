import { describe, expect, it } from "vite-plus/test";

import { createPawTrendsProbeStore } from "./paw-trends-probe-store";

describe("Paw Trends History persistence", () => {
  it("lists all record types and restores complete deleted relationships", async () => {
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-history-${crypto.randomUUID()}`,
    });
    await store.saveSetupRecord({
      dataOwnershipAcknowledged: true,
      dogName: "Mabel",
      labels: {
        Company: ["Oli"],
        "Dog Symptom": ["Limping"],
        "Owner Symptom": ["Headache"],
        Place: ["Lake11"],
        "Training Type": ["Physio"],
        Trigger: ["Dog"],
      },
      storageStatus: "browser-managed",
    });
    const walk = await store.saveWalk({
      activityMood: "Tense",
      company: ["Oli"],
      dogSymptoms: ["Limping"],
      durationMinutes: 35,
      localDate: "2026-09-05",
      place: "Lake11",
      startedAt: new Date(2026, 8, 5, 20, 15).toISOString(),
      triggerEncounters: [
        { id: "encounter-one", reactionSeverity: 3, trigger: "Dog" },
      ],
    });
    await store.saveTraining({
      activityMood: "Playful",
      dogSymptoms: [],
      localDate: "2026-09-04",
      startedAt: new Date(2026, 8, 4, 9, 0).toISOString(),
      trainingType: "Physio",
    });
    await store.saveMoodEntry({
      localDate: "2026-09-05",
      mood: "Good",
      recordedAt: new Date(2026, 8, 5, 8, 0).toISOString(),
      subject: "owner",
    });
    await store.saveDailyCheckIn("2026-09-05", ["Headache"]);

    const allRecords = await store.listHistoryRecords();
    expect(allRecords.map((entry) => entry.kind).toSorted()).toStrictEqual([
      "check-in",
      "mood",
      "training",
      "walk",
    ]);

    const walkRecord = allRecords.find(
      (entry) => entry.kind === "walk" && entry.record.id === walk.id
    );
    expect(walkRecord?.kind).toBe("walk");
    if (walkRecord?.kind !== "walk") {
      throw new Error("History test Walk record was not found.");
    }
    await store.deleteHistoryRecord(walkRecord);
    await expect(store.listWalksForDate("2026-09-05")).resolves.toStrictEqual(
      []
    );

    await store.restoreHistoryRecord(walkRecord);
    await expect(store.listWalksForDate("2026-09-05")).resolves.toStrictEqual([
      walk,
    ]);
    const restoredWalks = await store.listWalksForDate("2026-09-05");
    expect(restoredWalks[0]?.triggerEncounters).toStrictEqual([
      { id: "encounter-one", reactionSeverity: 3, trigger: "Dog" },
    ]);
  });

  it("moves a Daily Check-in without losing its original completion time", async () => {
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-history-check-in-${crypto.randomUUID()}`,
    });
    const original = await store.saveDailyCheckIn("2026-09-03", []);

    const edited = await store.moveDailyCheckIn("2026-09-03", "2026-09-02", [
      "Headache",
    ]);

    expect(edited.completedAt).toBe(original.completedAt);
    expect(edited.ownerSymptoms).toStrictEqual(["Headache"]);
    await expect(store.readDailyCheckIn("2026-09-03")).resolves.toBeNull();
    await expect(store.readDailyCheckIn("2026-09-02")).resolves.toStrictEqual(
      edited
    );
  });
});
