import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vite-plus/test";

import {
  createPawTrendsProbeStore,
  PAW_TRENDS_SEEDED_REUSABLE_LABELS,
} from "@/persistence/paw-trends-probe-store";
import type {
  PawTrendsDogMood,
  PawTrendsProbeStore,
} from "@/persistence/paw-trends-probe-store";

import { PawTrendsPatternReadinessScreen } from "./paw-trends-pattern-readiness";

// oxlint-disable vitest/max-expects -- These tests verify each visible readiness state as one screen.

const createReadyPawTrendsStore = async (): Promise<PawTrendsProbeStore> => {
  const store = createPawTrendsProbeStore({
    databaseName: `paw-trends-patterns-${crypto.randomUUID()}`,
  });
  await store.saveSetupRecord({
    dataOwnershipAcknowledged: true,
    dogName: "Mabel",
    labels: PAW_TRENDS_SEEDED_REUSABLE_LABELS,
    storageStatus: "browser-managed",
  });
  return store;
};

const getPawTrendsReadinessCount = (label: string): HTMLElement => {
  const term = within(screen.getByLabelText("Observation counts")).getByText(
    label
  );
  const countGroup = term.closest("div");
  if (countGroup === null) {
    throw new Error(`Pattern readiness count was not found for ${label}.`);
  }
  return within(countGroup).getByRole("definition");
};

const getPawTrendsMoodOccurrenceCount = (
  mood: PawTrendsDogMood
): HTMLElement => {
  const term = within(
    screen.getByLabelText("Dog Mood occurrence counts")
  ).getByText(mood);
  const countGroup = term.closest("div");
  if (countGroup === null) {
    throw new Error(`Dog Mood occurrence count was not found for ${mood}.`);
  }
  return within(countGroup).getByRole("definition");
};

const savePawTrendsReadinessWalk = async (
  store: PawTrendsProbeStore,
  day: number,
  activityMood: PawTrendsDogMood
) =>
  await store.saveWalk({
    activityMood,
    company: [],
    dogSymptoms: [],
    durationMinutes: 30,
    localDate: `2026-08-${String(day).padStart(2, "0")}`,
    place: "Home route",
    startedAt: `2026-08-${String(day).padStart(2, "0")}T08:00:00.000Z`,
    triggerEncounters: [],
  });

describe("Pattern data readiness", () => {
  it("shows an honest empty state with zero counts", async () => {
    const store = await createReadyPawTrendsStore();

    render(<PawTrendsPatternReadinessScreen store={store} />);

    await expect(
      screen.findByRole("heading", { name: "Start with what happened." })
    ).resolves.toBeVisible();
    expect(getPawTrendsReadinessCount("Observed Days")).toHaveTextContent("0");
    expect(getPawTrendsReadinessCount("Walks")).toHaveTextContent("0");
    expect(getPawTrendsReadinessCount("Training sessions")).toHaveTextContent(
      "0"
    );
    expect(
      getPawTrendsReadinessCount("Completed Daily Check-ins")
    ).toHaveTextContent("0");
    expect(
      screen.getByText(/never shows that a Factor caused a Dog Mood/iu)
    ).toBeVisible();
  });

  it("shows partial counts and updates them after relevant record changes", async () => {
    const store = await createReadyPawTrendsStore();
    const walk = await savePawTrendsReadinessWalk(store, 1, "Playful");
    await store.saveTraining({
      activityMood: "Sleepy",
      dogSymptoms: [],
      localDate: "2026-08-02",
      startedAt: "2026-08-02T08:00:00.000Z",
      trainingType: "Physio",
    });
    await store.saveDailyCheckIn("2026-08-01", []);
    const moodEntry = await store.saveMoodEntry({
      localDate: "2026-08-01",
      mood: "Playful",
      recordedAt: "2026-08-01T09:00:00.000Z",
      subject: "dog",
    });

    render(<PawTrendsPatternReadinessScreen store={store} />);

    await expect(
      screen.findByRole("heading", { name: "Your record is taking shape." })
    ).resolves.toBeVisible();
    expect(getPawTrendsReadinessCount("Observed Days")).toHaveTextContent("1");
    expect(getPawTrendsReadinessCount("Walks")).toHaveTextContent("1");
    expect(getPawTrendsReadinessCount("Training sessions")).toHaveTextContent(
      "1"
    );
    expect(
      getPawTrendsReadinessCount("Completed Daily Check-ins")
    ).toHaveTextContent("1");
    expect(getPawTrendsMoodOccurrenceCount("Playful")).toHaveTextContent("1");

    const editedMoodEntry = await store.saveMoodEntry({
      ...moodEntry,
      mood: "Tense",
    });
    await expect(
      screen.findByText("Tense", {
        selector: "dt",
      })
    ).resolves.toBeVisible();
    await expect
      .poll(() => getPawTrendsMoodOccurrenceCount("Tense").textContent)
      .toBe("1");
    expect(getPawTrendsMoodOccurrenceCount("Playful")).toHaveTextContent("0");

    await store.deleteMoodEntry(editedMoodEntry.id);
    await expect
      .poll(() => getPawTrendsMoodOccurrenceCount("Tense").textContent)
      .toBe("0");
    await store.restoreHistoryRecord({ kind: "mood", record: editedMoodEntry });
    await expect
      .poll(() => getPawTrendsMoodOccurrenceCount("Tense").textContent)
      .toBe("1");

    await store.deleteWalk(walk.id);
    await expect
      .poll(() => getPawTrendsReadinessCount("Walks").textContent)
      .toBe("0");
    await store.restoreHistoryRecord({ kind: "walk", record: walk });
    await expect
      .poll(() => getPawTrendsReadinessCount("Walks").textContent)
      .toBe("1");
  });

  it("reports when a Dog Mood has five activity samples on each side", async () => {
    const store = await createReadyPawTrendsStore();
    await Promise.all([
      ...Array.from({ length: 5 }, async (_, index) => {
        await savePawTrendsReadinessWalk(store, index + 1, "Playful");
      }),
      ...Array.from({ length: 5 }, async (_, index) => {
        await savePawTrendsReadinessWalk(store, index + 6, "Tense");
      }),
    ]);

    render(<PawTrendsPatternReadinessScreen store={store} />);

    await expect(
      screen.findByRole("heading", {
        name: "The mood sample threshold is met.",
      })
    ).resolves.toBeVisible();
    expect(getPawTrendsReadinessCount("Walks")).toHaveTextContent("10");
    expect(
      screen.getByText(/Each Factor still needs enough variation/iu)
    ).toBeVisible();
    expect(screen.queryByText(/strongest|ranking/iu)).not.toBeInTheDocument();
  });

  it("shows transparent eligible Association cards and filters the global top ten", async () => {
    const store = await createReadyPawTrendsStore();
    await Promise.all(
      Array.from({ length: 10 }, async (_, index) => {
        await store.saveWalk({
          activityMood: index < 5 ? "Playful" : "Tense",
          company: [],
          dogSymptoms: [],
          durationMinutes: index < 5 ? 60 : 20,
          localDate: `2026-08-${String(index + 1).padStart(2, "0")}`,
          place: index < 5 ? "Lake11" : "Home route",
          startedAt: `2026-08-${String(index + 1).padStart(2, "0")}T08:00:00.000Z`,
          triggerEncounters: [],
        });
      })
    );

    render(<PawTrendsPatternReadinessScreen store={store} />);

    await expect(
      screen.findByRole("heading", { name: "Strongest activity Associations" })
    ).resolves.toBeVisible();
    expect(screen.getAllByText("Association, not causation.")).not.toHaveLength(
      0
    );
    expect(screen.getAllByText("Walk duration")).not.toHaveLength(0);
    expect(screen.getAllByText("5 Walks")).not.toHaveLength(0);
    expect(screen.getAllByText(/\+40 minutes/iu)).not.toHaveLength(0);
    expect(
      screen.getAllByText(/Ranked by absolute Pearson r/iu)
    ).not.toHaveLength(0);
    expect(
      screen.getAllByRole("meter", { name: /normalized strength/iu })
    ).not.toHaveLength(0);

    fireEvent.change(screen.getByLabelText("Dog Mood"), {
      target: { value: "Tense" },
    });
    expect(screen.getByLabelText("Rank 2")).toBeVisible();

    fireEvent.change(screen.getByLabelText("Dog Mood"), {
      target: { value: "Aggressive" },
    });
    expect(
      screen.getByRole("heading", {
        name: "No eligible Association for Aggressive yet.",
      })
    ).toBeVisible();
  });
});
