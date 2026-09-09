import { expect, test } from "@playwright/test";

import {
  completePawTrendsReleaseSetup,
  getPawTrendsHistoryCard,
} from "./paw-trends-release-helpers";

test("logs every observation type and corrects a Walk through History", async ({
  page,
}) => {
  await completePawTrendsReleaseSetup(page);

  await page.getByRole("button", { name: "Add mood" }).first().click();
  await page.locator("form.paw-inline-editor select").selectOption("Tense");
  await page.getByRole("button", { name: "Save mood" }).click();
  await expect(page.getByText("Tense", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Add mood" }).click();
  await page.locator("form.paw-inline-editor select").selectOption("Anxious");
  await page.getByLabel(/Notes/).fill("Busy morning");
  await page.getByRole("button", { name: "Save mood" }).click();
  await expect(
    page.getByText("Anxious", { exact: true }).first()
  ).toBeVisible();

  await page.getByRole("button", { name: "Check in" }).click();
  await page.getByLabel("Headache").check();
  await page.getByRole("button", { name: "Save check-in" }).click();
  await expect(page.getByText("Completed · Headache")).toBeVisible();

  await page.getByRole("button", { name: "Log activity" }).click();
  await page.getByRole("button", { name: "Walk", exact: true }).click();
  const walkEditor = page.getByRole("form", { name: "Log Walk" });
  await walkEditor.getByLabel("Duration in minutes").fill("30");
  await walkEditor.locator("select").nth(0).selectOption("Home route");
  await walkEditor.locator("select").nth(1).selectOption("Playful");
  await walkEditor.getByRole("button", { name: "Add encounter" }).click();
  await walkEditor.locator("select").nth(2).selectOption("Dog");
  await walkEditor.locator("select").nth(3).selectOption("2");
  await walkEditor.getByRole("button", { name: "Save Walk" }).click();
  await expect(page.getByText("Home route", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Log activity" }).click();
  await page.getByRole("button", { name: "Training", exact: true }).click();
  const trainingEditor = page.getByRole("form", { name: "Log Training" });
  await trainingEditor.locator("select").nth(0).selectOption("Physio");
  await trainingEditor.locator("select").nth(1).selectOption("Sleepy");
  await trainingEditor.getByLabel("Limping").check();
  await trainingEditor.getByRole("button", { name: "Save Training" }).click();
  await expect(page.getByText("Physio", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "History" }).click();
  await expect(page.getByText("5 in this view")).toBeVisible();
  const walkHistoryCard = getPawTrendsHistoryCard(page, "Home route");
  await walkHistoryCard.getByRole("button").first().click();
  await expect(walkHistoryCard.getByText("Dog, severity 2")).toBeVisible();
  await walkHistoryCard.getByRole("button", { name: "Edit" }).click();
  const editWalk = page.getByRole("form", { name: "Edit Walk" });
  await editWalk.getByLabel("Duration in minutes").fill("45");
  await editWalk.getByRole("button", { name: "Save Walk" }).click();
  await expect(getPawTrendsHistoryCard(page, "Home route")).toContainText(
    "45 min"
  );

  await getPawTrendsHistoryCard(page, "Home route")
    .getByRole("button", { name: /Delete Walk/ })
    .click();
  await expect(page.getByText("Walk deleted")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(getPawTrendsHistoryCard(page, "Home route")).toContainText(
    "45 min"
  );
});

test("merges a used label, downloads a backup, and restores it", async ({
  page,
}) => {
  await completePawTrendsReleaseSetup(page);

  await page.getByRole("button", { name: "Log activity" }).click();
  await page.getByRole("button", { name: "Walk", exact: true }).click();
  const walkEditor = page.getByRole("form", { name: "Log Walk" });
  await walkEditor.getByLabel("Duration in minutes").fill("20");
  await walkEditor.locator("select").nth(0).selectOption("Home route");
  await walkEditor.locator("select").nth(1).selectOption("Playful");
  await walkEditor.getByRole("button", { name: "Save Walk" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  const homeRouteLabel = page.getByRole("listitem").filter({
    has: page.getByText("Home route", { exact: true }),
  });
  await homeRouteLabel.getByRole("button", { name: "Merge" }).click();
  await homeRouteLabel.getByLabel("Keep this label").selectOption("Lake11");
  await expect(homeRouteLabel.getByText(/Walk/)).toBeVisible();
  await homeRouteLabel.getByRole("button", { name: "Merge labels" }).click();
  await expect(page.getByText("Home route merged into Lake11.")).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON backup" }).click();
  const backupDownload = await downloadPromise;
  const backupPath = await backupDownload.path();
  expect(backupPath).not.toBeNull();
  await expect(page.getByText("Backup downloaded.")).toBeVisible();

  await page.getByLabel("Choose JSON backup").setInputFiles(backupPath!);
  await expect(page.getByLabel("Restore preview")).toContainText("Mabel");
  await page
    .getByRole("button", { name: "Replace all data with this backup" })
    .click();
  await expect(
    page.getByText("Backup restored. All current data was replaced.")
  ).toBeVisible();
  await page.getByRole("button", { name: "History" }).click();
  await expect(getPawTrendsHistoryCard(page, "Lake11")).toBeVisible();
});

test("updates the offline shell without losing local records", async ({
  page,
}) => {
  await completePawTrendsReleaseSetup(page);
  await page.waitForFunction(
    () => "serviceWorker" in navigator && navigator.serviceWorker.controller
  );
  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.update())
    );
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Today with Mabel" })
  ).toBeVisible();

  await page.context().setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Today with Mabel" })
  ).toBeVisible();
  await page.context().setOffline(false);
});

test("does not send observation data outside the Site origin", async ({
  page,
}) => {
  const externalRequests: string[] = [];
  page.on("request", (request) => {
    const requestUrl = new URL(request.url());
    if (requestUrl.origin !== "http://127.0.0.1:4173") {
      externalRequests.push(request.url());
    }
  });
  await completePawTrendsReleaseSetup(page);
  await page.getByRole("button", { name: "Add mood" }).first().click();
  await page.getByRole("button", { name: "Save mood" }).click();
  await expect(externalRequests).toEqual([]);
});
