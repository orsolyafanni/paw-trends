import { expect, test } from "@playwright/test";

import { completePawTrendsReleaseSetup } from "./paw-trends-release-helpers";

test.use({
  colorScheme: "dark",
  locale: "hu-HU",
  timezoneId: "Europe/Budapest",
});

test("stays usable with touch, dark appearance, locale, timezone, and 200 percent text", async ({
  page,
}) => {
  await completePawTrendsReleaseSetup(page);
  await expect(
    page.evaluate(() => ({
      coarsePointer: matchMedia("(pointer: coarse)").matches,
      darkAppearance: matchMedia("(prefers-color-scheme: dark)").matches,
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }))
  ).resolves.toEqual({
    coarsePointer: true,
    darkAppearance: true,
    locale: "hu-HU",
    timezone: "Europe/Budapest",
  });

  const unnamedControls = await page
    .locator("button, input, select, textarea")
    .evaluateAll((controls) =>
      controls
        .filter((control) => {
          if (
            control instanceof HTMLInputElement &&
            control.type === "hidden"
          ) {
            return false;
          }
          const labels =
            control instanceof HTMLInputElement ||
            control instanceof HTMLSelectElement ||
            control instanceof HTMLTextAreaElement
              ? [...control.labels].map((label) => label.textContent).join(" ")
              : "";
          return !(
            control.getAttribute("aria-label") ||
            control.textContent?.trim() ||
            labels.trim()
          );
        })
        .map((control) => control.outerHTML)
    );
  expect(unnamedControls).toEqual([]);

  const undersizedButtons = await page
    .locator("button:visible")
    .evaluateAll((buttons) =>
      buttons
        .filter((button) => {
          const bounds = button.getBoundingClientRect();
          return bounds.width < 44 || bounds.height < 44;
        })
        .map((button) => button.textContent?.trim() || button.outerHTML)
    );
  expect(undersizedButtons).toEqual([]);

  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(
    page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)
  ).resolves.toBe(true);

  await page.keyboard.press("Tab");
  await expect(page.locator(":focus-visible")).toBeVisible();
});
