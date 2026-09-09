import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Completes first-run setup with one Owner Symptom used by release flows. */
export async function completePawTrendsReleaseSetup(page: Page) {
  await page.goto("/");
  await page.getByRole("textbox", { name: "Dog's name" }).fill("Mabel");
  await page.getByLabel("New Owner Symptom label").fill("Headache");
  await page.getByRole("button", { name: "Add Owner Symptom label" }).click();
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

/** Returns the History card that contains the exact visible record title. */
export function getPawTrendsHistoryCard(page: Page, title: string) {
  return page.locator("article.paw-history-entry-card").filter({
    has: page.getByText(title, { exact: true }),
  });
}
