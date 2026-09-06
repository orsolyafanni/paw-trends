import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function completePawTrendsSetup(page: Page) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Dog's name" }).fill("Mabel");
  await page
    .getByLabel("I understand this browser holds my Paw Trends data.")
    .check();
  await page
    .getByRole("button", { name: "Complete setup and open Today" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Today with Mabel" })
  ).toBeVisible();
}

test("completes setup and keeps Today after reopening at an iPhone size", async ({
  page,
}) => {
  await completePawTrendsSetup(page);
  await expect(page.getByText("No Dog Mood logged")).toBeVisible();
  await expect(page.getByText("No Owner Mood logged")).toBeVisible();
  await expect(page.getByText("Not completed")).toBeVisible();

  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Today with Mabel" })
  ).toBeVisible();
  await expect(page).toHaveTitle(/Paw Trends/);
});

test("reaches all four phone navigation destinations", async ({ page }) => {
  await completePawTrendsSetup(page);

  await page.getByRole("button", { name: "History" }).click();
  await expect(
    page.getByRole("heading", { name: "History", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Patterns" }).click();
  await expect(
    page.getByRole("heading", { name: "Patterns", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Today" }).click();
  await expect(
    page.getByRole("heading", { name: "Today with Mabel" })
  ).toBeVisible();
});

test("reopens the Today shell after the first online load", async ({
  page,
}) => {
  await completePawTrendsSetup(page);
  await page.waitForFunction(
    () => "serviceWorker" in navigator && navigator.serviceWorker.controller
  );

  await page.context().setOffline(true);
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Today with Mabel" })
  ).toBeVisible();
  await page.context().setOffline(false);
});
