import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  createPawTrendsProbeStore,
  getPawTrendsLocalDate,
  PAW_TRENDS_SEEDED_REUSABLE_LABELS,
} from "@/persistence/paw-trends-probe-store";
import type { PawTrendsSetupRecord } from "@/persistence/paw-trends-probe-store";

import { PawTrendsTrainingEditor } from "./paw-trends-training-editor";

// oxlint-disable vitest/max-expects -- This test covers the complete create and edit journey.
describe("Paw Trends Training editor", () => {
  it("creates a Training Type inline, saves empty symptoms, and edits the Training", async () => {
    const user = userEvent.setup();
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-training-editor-${crypto.randomUUID()}`,
    });
    const setup = await store.saveSetupRecord({
      dataOwnershipAcknowledged: true,
      dogName: "Mabel",
      labels: structuredClone(PAW_TRENDS_SEEDED_REUSABLE_LABELS),
      storageStatus: "browser-managed",
    });
    const onSaved = vi.fn<() => Promise<void>>().mockResolvedValue();
    const onLabelsChanged = vi.fn<(nextSetup: PawTrendsSetupRecord) => void>();
    const onCancel = vi.fn<() => void>();
    const firstRender = render(
      <PawTrendsTrainingEditor
        labels={setup.labels}
        store={store}
        onCancel={onCancel}
        onLabelsChanged={onLabelsChanged}
        onSaved={onSaved}
      />
    );

    expect(screen.getByLabelText("Date")).toBeRequired();
    expect(screen.getByLabelText("Time")).toBeRequired();
    expect(screen.getByLabelText("Training Type")).toBeRequired();
    expect(screen.getByLabelText("Activity Mood")).toBeRequired();
    expect(
      screen.queryByLabelText("Duration in minutes")
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Place")).not.toBeInTheDocument();
    expect(screen.queryByText("Trigger Encounters")).not.toBeInTheDocument();

    await user.type(
      screen.getByLabelText("New Training Type label"),
      "Hoopers"
    );
    await user.click(screen.getByRole("button", { name: "Add" }));
    await user.selectOptions(screen.getByLabelText("Activity Mood"), "Playful");
    await user.click(screen.getByRole("button", { name: "Save Training" }));

    expect(onLabelsChanged).toHaveBeenCalledOnce();
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
    const localDate = getPawTrendsLocalDate(new Date());
    const [savedTraining] = await store.listTrainingsForDate(localDate);
    if (savedTraining === undefined) {
      throw new Error("Expected the Training to be saved.");
    }
    expect(savedTraining).toMatchObject({
      dogSymptoms: [],
      trainingType: "Hoopers",
    });

    firstRender.unmount();
    const updatedSetup = await store.readSetupRecord();
    render(
      <PawTrendsTrainingEditor
        initialTraining={savedTraining}
        labels={updatedSetup?.labels ?? setup.labels}
        store={store}
        onCancel={onCancel}
        onLabelsChanged={onLabelsChanged}
        onSaved={onSaved}
      />
    );
    const editor = screen.getByRole("form", { name: "Edit Training" });
    await user.click(within(editor).getByLabelText("Limping"));
    await user.selectOptions(
      within(editor).getByLabelText("Activity Mood"),
      "Tense"
    );
    await user.click(
      within(editor).getByRole("button", { name: "Save Training" })
    );

    const [editedTraining] = await store.listTrainingsForDate(localDate);
    expect(editedTraining).toMatchObject({
      activityMood: "Tense",
      dogSymptoms: ["Limping"],
      trainingType: "Hoopers",
    });
  });
});
