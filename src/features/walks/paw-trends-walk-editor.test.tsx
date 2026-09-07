import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  createPawTrendsProbeStore,
  getPawTrendsLocalDate,
  PAW_TRENDS_SEEDED_REUSABLE_LABELS,
} from "@/persistence/paw-trends-probe-store";
import type { PawTrendsSetupRecord } from "@/persistence/paw-trends-probe-store";

import { PawTrendsWalkEditor } from "./paw-trends-walk-editor";

describe("Paw Trends Walk editor", () => {
  it("adds repeated encounters, saves a Walk, then reopens it for removal", async () => {
    const user = userEvent.setup();
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-walk-editor-${crypto.randomUUID()}`,
    });
    const setup = await store.saveSetupRecord({
      dataOwnershipAcknowledged: true,
      dogName: "Mabel",
      labels: structuredClone(PAW_TRENDS_SEEDED_REUSABLE_LABELS),
      storageStatus: "browser-managed",
    });
    const onSaved = vi.fn<() => Promise<void>>().mockResolvedValue();
    const onCancel = vi.fn<() => void>();
    const onLabelsChanged = vi.fn<(setup: PawTrendsSetupRecord) => void>();
    const firstRender = render(
      <PawTrendsWalkEditor
        labels={setup.labels}
        recentTriggers={["Dog"]}
        store={store}
        onCancel={onCancel}
        onLabelsChanged={onLabelsChanged}
        onSaved={onSaved}
      />
    );

    await user.type(screen.getByLabelText("Duration in minutes"), "35");
    await user.selectOptions(screen.getByLabelText("Place"), "Home route");
    await user.selectOptions(screen.getByLabelText("Activity Mood"), "Playful");
    await user.click(screen.getByRole("button", { name: "Dog" }));
    await user.click(
      screen.getByRole("button", { name: "Repeat last Trigger: Dog" })
    );
    const severityFields = screen.getAllByLabelText("Reaction Severity");
    const secondSeverityField = severityFields.at(1);
    if (secondSeverityField === undefined) {
      throw new Error("Expected a second Reaction Severity field.");
    }
    await user.selectOptions(secondSeverityField, "5");
    await user.click(screen.getByRole("button", { name: "Save Walk" }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
    const localDate = getPawTrendsLocalDate(new Date());
    const [savedWalk] = await store.listWalksForDate(localDate);
    if (savedWalk === undefined) {
      throw new Error("Expected the Walk to be saved.");
    }
    expect(
      savedWalk.triggerEncounters.map((encounter) => encounter.reactionSeverity)
    ).toStrictEqual([0, 5]);

    firstRender.unmount();
    render(
      <PawTrendsWalkEditor
        initialWalk={savedWalk}
        labels={setup.labels}
        recentTriggers={["Dog"]}
        store={store}
        onCancel={onCancel}
        onLabelsChanged={onLabelsChanged}
        onSaved={onSaved}
      />
    );
    const editor = screen.getByRole("form", { name: "Edit Walk" });
    await user.click(
      within(editor).getByRole("button", { name: "Remove encounter 2" })
    );
    await user.click(within(editor).getByRole("button", { name: "Save Walk" }));
    const [editedWalk] = await store.listWalksForDate(localDate);
    expect(editedWalk?.triggerEncounters).toHaveLength(1);
  });
});
