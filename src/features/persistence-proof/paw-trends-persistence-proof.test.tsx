import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import { createPawTrendsProbeStore } from "@/persistence/paw-trends-probe-store";
import type { PawTrendsProbeRecord } from "@/persistence/paw-trends-probe-store";

import { PawTrendsPersistenceProof } from "./paw-trends-persistence-proof";

describe("Paw Trends persistence proof", () => {
  it("creates, exports, and restores the sample record from the owner UI", async () => {
    const user = userEvent.setup();
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-ui-${crypto.randomUUID()}`,
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: () => "blob:paw-trends-backup",
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: () => {},
    });
    render(<PawTrendsPersistenceProof store={store} />);

    await user.type(
      screen.getByLabelText("Sample observation"),
      "Grumpy after the home route"
    );
    await user.click(
      screen.getByRole("button", { name: "Save on this iPhone" })
    );
    await expect(
      within(screen.getByLabelText("Saved sample")).findByText(
        "Grumpy after the home route"
      )
    ).resolves.toBeVisible();

    await user.click(screen.getByRole("button", { name: "Export backup" }));
    expect(clickSpy).toHaveBeenCalledOnce();
    await expect(screen.findByText("Backup downloaded")).resolves.toBeVisible();

    const restoredRecord: PawTrendsProbeRecord = {
      id: "owner-sample",
      note: "Relaxed after mantraing",
      savedAt: "2026-09-06T09:15:00.000Z",
      schemaVersion: 1,
    };
    const backupJson = JSON.stringify({
      exportedAt: "2026-09-06T09:20:00.000Z",
      product: "Paw Trends",
      records: [restoredRecord],
      version: 1,
    });
    const file = new File([backupJson], "paw-trends-backup.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      // oxlint-disable-next-line require-await -- mirrors the browser's asynchronous File.text API.
      value: async () => backupJson,
    });
    await user.upload(screen.getByLabelText("Restore backup"), file);

    await expect(
      within(screen.getByLabelText("Saved sample")).findByText(
        "Relaxed after mantraing"
      )
    ).resolves.toBeVisible();
    await expect(screen.findByText("Backup restored")).resolves.toBeVisible();
  });
});
