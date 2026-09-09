import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

interface PawTrendsPreviewActivity {
  activityMood: "Playful" | "Sleepy" | "Tense";
  company?: string[];
  createdAt: string;
  dogSymptoms: string[];
  durationMinutes?: number;
  id: string;
  kind: "training" | "walk";
  localDate: string;
  place?: string;
  startedAt: string;
  trainingType?: string;
  triggerEncounters?: {
    id: string;
    reactionSeverity: number;
    trigger: string;
  }[];
  updatedAt: string;
}

const createPawTrendsPreviewActivities = (): PawTrendsPreviewActivity[] => {
  const playfulDurations = [62, 48, 55, 43, 58, 51];
  const tenseDurations = [24, 36, 31, 28, 39, 33];
  const walks: PawTrendsPreviewActivity[] = [
    ...playfulDurations.map((durationMinutes, index) => ({
      activityMood: "Playful" as const,
      company: index < 5 ? ["Anna"] : [],
      createdAt: `2026-08-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
      dogSymptoms: index === 5 ? ["Limping"] : [],
      durationMinutes,
      id: `walk-playful-${index + 1}`,
      kind: "walk" as const,
      localDate: `2026-08-${String(index + 1).padStart(2, "0")}`,
      place: index < 5 ? "Lake11" : "Home route",
      startedAt: `2026-08-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
      triggerEncounters: Array.from(
        { length: index % 2 === 0 ? 2 : 1 },
        (_, encounterIndex) => ({
          id: `playful-${index + 1}-encounter-${encounterIndex + 1}`,
          reactionSeverity: encounterIndex === 0 ? 1 : 2,
          trigger: "Dog",
        })
      ),
      updatedAt: `2026-08-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
    })),
    ...tenseDurations.map((durationMinutes, index) => {
      const day = index + 7;
      return {
        activityMood: "Tense" as const,
        company: index === 0 ? ["Anna"] : [],
        createdAt: `2026-08-${String(day).padStart(2, "0")}T08:00:00.000Z`,
        dogSymptoms: index < 5 ? ["Limping"] : [],
        durationMinutes,
        id: `walk-tense-${index + 1}`,
        kind: "walk" as const,
        localDate: `2026-08-${String(day).padStart(2, "0")}`,
        place: index === 0 ? "Lake11" : "Home route",
        startedAt: `2026-08-${String(day).padStart(2, "0")}T08:00:00.000Z`,
        triggerEncounters: Array.from(
          { length: index % 2 === 0 ? 3 : 2 },
          (_, encounterIndex) => ({
            id: `tense-${index + 1}-encounter-${encounterIndex + 1}`,
            reactionSeverity: encounterIndex === 0 ? 5 : 4,
            trigger: "Dog",
          })
        ),
        updatedAt: `2026-08-${String(day).padStart(2, "0")}T08:00:00.000Z`,
      };
    }),
  ];
  const trainings: PawTrendsPreviewActivity[] = Array.from(
    { length: 10 },
    (_, index) => {
      const day = index + 13;
      return {
        activityMood: index < 5 ? "Sleepy" : "Tense",
        createdAt: `2026-08-${String(day).padStart(2, "0")}T17:00:00.000Z`,
        dogSymptoms: index < 5 ? [] : ["Limping"],
        id: `training-${index + 1}`,
        kind: "training",
        localDate: `2026-08-${String(day).padStart(2, "0")}`,
        startedAt: `2026-08-${String(day).padStart(2, "0")}T17:00:00.000Z`,
        trainingType: index < 5 ? "Physio" : "Mantrailing",
        updatedAt: `2026-08-${String(day).padStart(2, "0")}T17:00:00.000Z`,
      };
    }
  );
  return [...walks, ...trainings];
};

async function seedPawTrendsAssociationPreview(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("textbox", { name: "Dog's name" })).toBeVisible();
  const activities = createPawTrendsPreviewActivities();

  await page.evaluate(async (seedActivities) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("paw-trends-local");
      request.addEventListener("success", () => {
        resolve(request.result);
      });
      request.addEventListener("error", () => {
        reject(request.error);
      });
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(
        ["dogActivities", "setup"],
        "readwrite"
      );
      transaction.objectStore("setup").put({
        completedAt: "2026-08-01T07:00:00.000Z",
        dataOwnershipAcknowledged: true,
        dogName: "Mabel",
        id: "primary-owner",
        labels: {
          Company: ["Anna"],
          "Dog Symptom": ["Limping", "Robot-like movement"],
          "Owner Symptom": [],
          Place: ["Home route", "Lake11"],
          "Training Type": ["Mantrailing", "Physio"],
          Trigger: ["Dog", "Cat"],
        },
        schemaVersion: 2,
        storageStatus: "browser-managed",
      });
      for (const activity of seedActivities) {
        transaction.objectStore("dogActivities").put(activity);
      }
      transaction.addEventListener("complete", () => {
        resolve();
      });
      transaction.addEventListener("error", () => {
        reject(transaction.error);
      });
    });
    database.close();
  }, activities);

  await page.reload();
  await page.getByRole("button", { name: "Patterns" }).click();
  await expect(
    page.getByRole("heading", { name: "Strongest Associations" })
  ).toBeVisible();
}

test("captures the enough-data Association experience", async ({ page }) => {
  await page.setViewportSize({ height: 1000, width: 1360 });
  await seedPawTrendsAssociationPreview(page);
  await page.screenshot({
    path: ".impeccable/review/desktop.png",
  });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.screenshot({
    path: ".impeccable/review/mobile.png",
  });
  await page
    .getByText(/See the 12 Walks that counted/iu)
    .first()
    .click();
  await page.screenshot({
    path: ".impeccable/review/mobile-details.png",
  });
});
