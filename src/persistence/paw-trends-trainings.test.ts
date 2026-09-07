import { describe, expect, it } from "vite-plus/test";

import {
  createPawTrendsProbeStore,
  PAW_TRENDS_SEEDED_REUSABLE_LABELS,
} from "./paw-trends-probe-store";

const createTrainingStore = async () => {
  const store = createPawTrendsProbeStore({
    databaseName: `paw-trends-trainings-${crypto.randomUUID()}`,
  });
  await store.saveSetupRecord({
    dataOwnershipAcknowledged: true,
    dogName: "Mabel",
    labels: structuredClone(PAW_TRENDS_SEEDED_REUSABLE_LABELS),
    storageStatus: "browser-managed",
  });
  return store;
};

const validTraining = {
  activityMood: "Playful" as const,
  dogSymptoms: [] as string[],
  localDate: "2026-09-07",
  startedAt: new Date(2026, 8, 7, 10, 30).toISOString(),
  trainingType: "Mantrailing",
};

describe("Paw Trends Training", () => {
  it("stores and edits Training with an explicit empty Dog Symptoms list", async () => {
    const store = await createTrainingStore();
    const training = await store.saveTraining(validTraining);

    expect(training).toMatchObject({
      dogSymptoms: [],
      kind: "training",
      trainingType: "Mantrailing",
    });
    await expect(
      store.listDogActivitiesForDate("2026-09-07")
    ).resolves.toStrictEqual([training]);

    const edited = await store.saveTraining({
      ...training,
      activityMood: "Tense",
      trainingType: "Physio",
    });
    expect(edited.createdAt).toBe(training.createdAt);
    expect(edited.activityMood).toBe("Tense");
    await expect(
      store.listTrainingsForDate("2026-09-07")
    ).resolves.toStrictEqual([edited]);
  });

  it("requires date, time, Training Type, and Activity Mood", async () => {
    const store = await createTrainingStore();

    await expect(
      store.saveTraining({ ...validTraining, localDate: "2026-09-08" })
    ).rejects.toThrow("date and time must be valid and agree");
    await expect(
      store.saveTraining({ ...validTraining, trainingType: "" })
    ).rejects.toThrow("requires one Training Type");
    await expect(
      store.saveTraining({
        ...validTraining,
        // @ts-expect-error Verifies the store rejects corrupt runtime data.
        activityMood: "",
      })
    ).rejects.toThrow("requires an Activity Mood confirmation");
  });

  it("rejects mixtures of Training and Walk data", async () => {
    const store = await createTrainingStore();

    await expect(
      store.saveTraining({
        ...validTraining,
        // @ts-expect-error Training cannot persist a Walk duration.
        durationMinutes: 30,
      })
    ).rejects.toThrow("Training cannot include Walk-only fields");
    await expect(
      store.saveWalk({
        activityMood: "Playful",
        company: [],
        dogSymptoms: [],
        durationMinutes: 30,
        localDate: "2026-09-07",
        place: "Home route",
        startedAt: new Date(2026, 8, 7, 11).toISOString(),
        // @ts-expect-error Walk cannot persist a Training Type.
        trainingType: "Physio",
        triggerEncounters: [],
      })
    ).rejects.toThrow("Walk cannot include Training-only fields");
  });
});
