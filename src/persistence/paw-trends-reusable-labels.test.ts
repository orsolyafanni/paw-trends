import { describe, expect, it, vi } from "vite-plus/test";

import {
  createPawTrendsProbeStore,
  PAW_TRENDS_SEEDED_REUSABLE_LABELS,
} from "./paw-trends-probe-store";

const createReusableLabelStore = async (
  beforeReusableLabelCommit?: () => void
) => {
  const store = createPawTrendsProbeStore({
    beforeReusableLabelCommit,
    databaseName: `paw-trends-labels-${crypto.randomUUID()}`,
  });
  await store.saveSetupRecord({
    dataOwnershipAcknowledged: true,
    dogName: "Mabel",
    labels: {
      ...structuredClone(PAW_TRENDS_SEEDED_REUSABLE_LABELS),
      Company: ["Alex"],
      "Owner Symptom": ["Tired", "Headache"],
    },
    storageStatus: "browser-managed",
  });
  return store;
};

describe("Paw Trends reusable label persistence", () => {
  it("trims labels, prevents category-local duplicates, and permits shared text across categories", async () => {
    const store = await createReusableLabelStore();

    const triggerSetup = await store.saveReusableLabel(
      "Trigger",
      "  Bicycle  "
    );
    expect(triggerSetup.labels.Trigger).toContain("Bicycle");
    const duplicateSetup = await store.saveReusableLabel("Trigger", "bicycle");
    expect(
      duplicateSetup.labels.Trigger.filter(
        (label) => label.toLocaleLowerCase() === "bicycle"
      )
    ).toHaveLength(1);
    const companySetup = await store.saveReusableLabel("Company", "Bicycle");
    expect(companySetup.labels.Company).toContain("Bicycle");
  });

  it("protects used labels and deletes unused labels", async () => {
    const store = await createReusableLabelStore();
    await store.saveWalk({
      activityMood: "Playful",
      company: ["Alex"],
      dogSymptoms: [],
      durationMinutes: 20,
      localDate: "2026-09-07",
      place: "Home route",
      startedAt: new Date(2026, 8, 7, 9).toISOString(),
      triggerEncounters: [],
    });

    await expect(store.deleteReusableLabel("Company", "Alex")).rejects.toThrow(
      "Rename or merge it instead"
    );
    const setup = await store.deleteReusableLabel("Place", "Lake11");
    expect(setup.labels.Place).toStrictEqual(["Home route"]);
  });

  it("renames labels across Walks, Training, and Daily Check-ins", async () => {
    const store = await createReusableLabelStore();
    await store.saveWalk({
      activityMood: "Tense",
      company: [],
      dogSymptoms: ["Limping"],
      durationMinutes: 30,
      localDate: "2026-09-07",
      place: "Home route",
      startedAt: new Date(2026, 8, 7, 10).toISOString(),
      triggerEncounters: [
        { id: "dog-one", reactionSeverity: 2, trigger: "Dog" },
      ],
    });
    await store.saveTraining({
      activityMood: "Playful",
      dogSymptoms: ["Limping"],
      localDate: "2026-09-07",
      startedAt: new Date(2026, 8, 7, 12).toISOString(),
      trainingType: "Physio",
    });
    await store.saveDailyCheckIn("2026-09-07", ["Tired"]);

    await store.renameReusableLabel("Dog Symptom", "Limping", "  Sore paw ");
    await store.renameReusableLabel("Owner Symptom", "Tired", "Fatigued");

    const activities = await store.listDogActivitiesForDate("2026-09-07");
    expect(
      activities.every((activity) => activity.dogSymptoms.includes("Sore paw"))
    ).toBeTruthy();
    await expect(store.readDailyCheckIn("2026-09-07")).resolves.toMatchObject({
      ownerSymptoms: ["Fatigued"],
    });
  });

  it("previews and merges every historical reference into the retained label", async () => {
    const store = await createReusableLabelStore();
    await store.saveDailyCheckIn("2026-09-06", ["Tired"]);
    await store.saveDailyCheckIn("2026-09-07", ["Tired", "Headache"]);

    await expect(
      store.listReusableLabelReferences("Owner Symptom", "Tired")
    ).resolves.toHaveLength(2);
    const setup = await store.mergeReusableLabels(
      "Owner Symptom",
      "Tired",
      "Headache"
    );

    expect(setup.labels["Owner Symptom"]).toStrictEqual(["Headache"]);
    await expect(store.readDailyCheckIn("2026-09-07")).resolves.toMatchObject({
      ownerSymptoms: ["Headache"],
    });
  });

  it("rolls back labels and history when a merge fails inside the transaction", async () => {
    const failCommit = vi.fn<() => void>(() => {
      throw new Error("Injected merge failure");
    });
    const store = await createReusableLabelStore(failCommit);
    await store.saveDailyCheckIn("2026-09-07", ["Tired"]);

    await expect(
      store.mergeReusableLabels("Owner Symptom", "Tired", "Headache")
    ).rejects.toThrow("Injected merge failure");

    expect(failCommit).toHaveBeenCalledOnce();
    await expect(store.readSetupRecord()).resolves.toMatchObject({
      labels: { "Owner Symptom": ["Tired", "Headache"] },
    });
    await expect(store.readDailyCheckIn("2026-09-07")).resolves.toMatchObject({
      ownerSymptoms: ["Tired"],
    });
  });
});
