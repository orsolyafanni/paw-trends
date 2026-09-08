import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import { createPawTrendsProbeStore } from "@/persistence/paw-trends-probe-store";
import { exportPawTrendsBackup } from "@/backup/paw-trends-backup";

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

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save on this iPhone" })
      ).toBeEnabled();
    });

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
    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalledOnce();
    });
    await expect(screen.findByText("Backup downloaded")).resolves.toBeVisible();

    const restoreSource = createPawTrendsProbeStore({
      databaseName: `paw-trends-ui-restore-${crypto.randomUUID()}`,
    });
    await restoreSource.saveSampleRecord("Relaxed after mantraing");
    const backupJson = await exportPawTrendsBackup(restoreSource);
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
