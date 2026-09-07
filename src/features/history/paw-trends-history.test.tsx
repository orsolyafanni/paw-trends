import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vite-plus/test";

import { createPawTrendsProbeStore } from "@/persistence/paw-trends-probe-store";

import { PawTrendsHistory } from "./paw-trends-history";

// oxlint-disable vitest/max-expects -- This test covers one complete History correction journey.
describe("Paw Trends History", () => {
  it("keeps the date range while filtering, shows details, edits, deletes, and undoes", async () => {
    const user = userEvent.setup();
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-history-ui-${crypto.randomUUID()}`,
    });
    const setup = await store.saveSetupRecord({
      dataOwnershipAcknowledged: true,
      dogName: "Mabel",
      labels: {
        Company: ["Oli"],
        "Dog Symptom": ["Limping"],
        "Owner Symptom": ["Headache"],
        Place: ["Home route"],
        "Training Type": ["Physio"],
        Trigger: ["Dog"],
      },
      storageStatus: "browser-managed",
    });
    await store.saveWalk({
      activityMood: "Tense",
      company: ["Oli"],
      dogSymptoms: ["Limping"],
      durationMinutes: 35,
      localDate: "2026-09-05",
      place: "Home route",
      startedAt: new Date(2026, 8, 5, 20, 15).toISOString(),
      triggerEncounters: [
        { id: "history-encounter", reactionSeverity: 3, trigger: "Dog" },
      ],
    });
    await store.saveTraining({
      activityMood: "Playful",
      dogSymptoms: [],
      localDate: "2026-09-04",
      startedAt: new Date(2026, 8, 4, 9, 0).toISOString(),
      trainingType: "Physio",
    });

    render(<PawTrendsHistory setupRecord={setup} store={store} />);
    await expect(
      screen.findByText("Home route", { selector: "strong" })
    ).resolves.toBeVisible();

    await user.type(screen.getByLabelText("From"), "2026-09-05");
    await user.type(screen.getByLabelText("To"), "2026-09-05");
    await user.selectOptions(screen.getByLabelText("Entry type"), "training");
    expect(screen.getByLabelText("From")).toHaveValue("2026-09-05");
    expect(screen.getByLabelText("To")).toHaveValue("2026-09-05");
    expect(screen.getByText("No entries match these filters.")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Entry type"), "walk");
    const walkCard = screen
      .getByText("Home route", { selector: "strong" })
      .closest("article");
    if (walkCard === null) {
      throw new Error("History test Walk card was not found.");
    }
    await user.click(within(walkCard).getByRole("button", { expanded: false }));
    expect(within(walkCard).getByText("Dog, severity 3")).toBeVisible();
    expect(within(walkCard).getByText("Oli")).toBeVisible();
    expect(within(walkCard).getByText("Limping")).toBeVisible();

    await user.click(within(walkCard).getByRole("button", { name: "Edit" }));
    const editor = screen.getByRole("form", { name: "Edit Walk" });
    await user.clear(within(editor).getByLabelText("Duration in minutes"));
    await user.type(within(editor).getByLabelText("Duration in minutes"), "50");
    await user.click(within(editor).getByRole("button", { name: "Save Walk" }));
    await waitFor(() => {
      expect(screen.getByText("50 min · Tense")).toBeVisible();
    });

    const editedWalkCard = screen
      .getByText("Home route", { selector: "strong" })
      .closest("article");
    if (editedWalkCard === null) {
      throw new Error("Edited History test Walk card was not found.");
    }
    await user.click(
      within(editedWalkCard).getByRole("button", { name: /Delete Walk at/u })
    );
    await waitFor(() => {
      expect(screen.queryByText("Home route")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Walk deleted")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    await expect(
      screen.findByText("Home route", { selector: "strong" })
    ).resolves.toBeVisible();
    const restoredWalks = await store.listWalksForDate("2026-09-05");
    expect(restoredWalks[0]).toMatchObject({
      durationMinutes: 50,
      triggerEncounters: [
        { id: "history-encounter", reactionSeverity: 3, trigger: "Dog" },
      ],
    });
  });
});
