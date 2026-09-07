import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vite-plus/test";

import { createPawTrendsProbeStore } from "@/persistence/paw-trends-probe-store";

import { PawTrendsApp } from "./paw-trends-app";

// oxlint-disable vitest/max-expects -- These tests cover complete first-run journeys.

describe("Paw Trends first-run setup", () => {
  it("shows renamed labels immediately in Today and History", async () => {
    const user = userEvent.setup();
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-label-settings-ui-${crypto.randomUUID()}`,
    });
    await store.saveSetupRecord({
      dataOwnershipAcknowledged: true,
      dogName: "Mabel",
      labels: {
        Company: [],
        "Dog Symptom": [],
        "Owner Symptom": ["Tired"],
        Place: ["Home route"],
        "Training Type": ["Physio"],
        Trigger: ["Dog"],
      },
      storageStatus: "browser-managed",
    });
    const localDate = [
      new Date().getFullYear(),
      String(new Date().getMonth() + 1).padStart(2, "0"),
      String(new Date().getDate()).padStart(2, "0"),
    ].join("-");
    await store.saveDailyCheckIn(localDate, ["Tired"]);
    render(<PawTrendsApp store={store} />);

    const navigation = await screen.findByRole("navigation", {
      name: "Primary navigation",
    });
    await user.click(
      within(navigation).getByRole("button", { name: "Settings" })
    );
    const symptomHeading = screen.getByRole("heading", {
      name: "Owner Symptom",
    });
    const symptomGroup = symptomHeading.closest("section");
    if (symptomGroup === null) {
      throw new Error("Owner Symptom settings group was not found.");
    }
    await user.click(
      within(symptomGroup).getByRole("button", { name: "Rename" })
    );
    const nameInput = within(symptomGroup).getByLabelText("New name");
    await user.clear(nameInput);
    await user.type(nameInput, "Fatigued");
    await user.click(
      within(symptomGroup).getByRole("button", { name: "Save name" })
    );

    await user.click(within(navigation).getByRole("button", { name: "Today" }));
    expect(screen.getByText("Completed · Fatigued")).toBeVisible();
    await user.click(
      within(navigation).getByRole("button", { name: "History" })
    );
    await expect(screen.findByText("Fatigued")).resolves.toBeVisible();
  });

  it("saves adjusted labels and reopens on Today", async () => {
    const user = userEvent.setup();
    const databaseName = `paw-trends-setup-ui-${crypto.randomUUID()}`;
    const store = createPawTrendsProbeStore({ databaseName });
    const persist = vi.fn<() => Promise<boolean>>().mockResolvedValue(true);
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: { persist },
    });

    const firstVisit = render(<PawTrendsApp store={store} />);

    await expect(
      screen.findByRole("heading", {
        name: "A private field journal for you and your Dog.",
      })
    ).resolves.toBeVisible();
    expect(screen.getByText("Home route")).toBeVisible();
    expect(screen.getByText("Mantrailing")).toBeVisible();
    expect(screen.getAllByText("None yet")).toHaveLength(2);

    await user.click(
      screen.getByRole("button", { name: "Remove Cat from Trigger" })
    );
    await user.type(screen.getByLabelText("New Place label"), "Riverbank");
    await user.click(screen.getByRole("button", { name: "Add Place label" }));
    await user.type(screen.getByLabelText("Dog's name"), "Mabel");
    await user.click(
      screen.getByLabelText(
        "I understand this browser holds my Paw Trends data."
      )
    );
    await user.click(
      screen.getByRole("button", {
        name: "Complete setup and open Today",
      })
    );

    await expect(
      screen.findByRole("heading", { name: "Today with Mabel" })
    ).resolves.toBeVisible();
    expect(screen.getByText("No Dog Mood logged")).toBeVisible();
    expect(screen.getByText("No Owner Mood logged")).toBeVisible();
    expect(screen.getByText("Not completed")).toBeVisible();
    expect(screen.getByRole("button", { name: "Log activity" })).toBeVisible();
    expect(persist).toHaveBeenCalledOnce();

    const savedSetup = await store.readSetupRecord();
    expect(savedSetup).toMatchObject({
      dataOwnershipAcknowledged: true,
      dogName: "Mabel",
      storageStatus: "granted",
    });
    expect(savedSetup?.labels.Trigger).toStrictEqual(["Dog"]);
    expect(savedSetup?.labels.Place).toContain("Riverbank");

    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    await user.click(
      within(navigation).getByRole("button", { name: "History" })
    );
    expect(screen.getByRole("heading", { name: "History" })).toBeVisible();
    await user.click(
      within(navigation).getByRole("button", { name: "Patterns" })
    );
    expect(screen.getByRole("heading", { name: "Patterns" })).toBeVisible();
    await user.click(
      within(navigation).getByRole("button", { name: "Settings" })
    );
    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();

    firstVisit.unmount();
    render(
      <PawTrendsApp store={createPawTrendsProbeStore({ databaseName })} />
    );
    await expect(
      screen.findByRole("heading", { name: "Today with Mabel" })
    ).resolves.toBeVisible();
  });

  it("requires the Dog name and browser-data acknowledgment", async () => {
    const user = userEvent.setup();
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-setup-errors-${crypto.randomUUID()}`,
    });
    render(<PawTrendsApp store={store} />);

    await user.click(
      await screen.findByRole("button", {
        name: "Complete setup and open Today",
      })
    );
    expect(
      screen.getByText("Enter your Dog's name to continue.")
    ).toBeVisible();

    await user.type(screen.getByLabelText("Dog's name"), "Mabel");
    await user.click(
      screen.getByRole("button", { name: "Complete setup and open Today" })
    );
    expect(
      screen.getByText("Confirm where Paw Trends keeps your data to continue.")
    ).toBeVisible();
  });

  it("reopens a saved Training from Today for editing", async () => {
    const user = userEvent.setup();
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-training-today-${crypto.randomUUID()}`,
    });
    await store.saveSetupRecord({
      dataOwnershipAcknowledged: true,
      dogName: "Mabel",
      labels: {
        Company: [],
        "Dog Symptom": ["Limping"],
        "Owner Symptom": [],
        Place: ["Home route"],
        "Training Type": ["Mantrailing", "Physio"],
        Trigger: ["Dog"],
      },
      storageStatus: "browser-managed",
    });
    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    await store.saveTraining({
      activityMood: "Playful",
      dogSymptoms: [],
      localDate,
      startedAt: now.toISOString(),
      trainingType: "Mantrailing",
    });

    render(<PawTrendsApp store={store} />);
    await expect(
      screen.findByRole("heading", { name: "Mantrailing" })
    ).resolves.toBeVisible();
    await user.click(screen.getByRole("button", { name: "Edit" }));

    expect(screen.getByRole("form", { name: "Edit Training" })).toBeVisible();
    expect(
      screen.queryByLabelText("Duration in minutes")
    ).not.toBeInTheDocument();
  });
});
