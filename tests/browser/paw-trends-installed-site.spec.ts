import { expect, test } from "@playwright/test";

test("keeps the sample record after reopening at an iPhone size", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Sample observation").fill("Tense near a cat");
  await page.getByRole("button", { name: "Save on this iPhone" }).click();
  await expect(page.getByLabel("Saved sample")).toContainText(
    "Tense near a cat"
  );

  await page.reload();

  await expect(page.getByLabel("Saved sample")).toContainText(
    "Tense near a cat"
  );
  await expect(page).toHaveTitle(/Paw Trends/);
});

test("reopens the app shell after the first online load", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your private storage check" })
  ).toBeVisible();
  await page.waitForFunction(
    () => "serviceWorker" in navigator && navigator.serviceWorker.controller
  );

  await page.context().setOffline(true);
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Your private storage check" })
  ).toBeVisible();
  await expect(
    page.getByText("You are offline", { exact: true })
  ).toBeVisible();
  await page.context().setOffline(false);
});
