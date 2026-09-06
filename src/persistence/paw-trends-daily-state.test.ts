import { describe, expect, it } from "vite-plus/test";

import {
  createPawTrendsProbeStore,
  getPawTrendsLocalDate,
  getPawTrendsMoodIntervalEnd,
} from "./paw-trends-probe-store";
import type { PawTrendsMoodEntry } from "./paw-trends-probe-store";

describe("Paw Trends daily state", () => {
  it("inserts, edits, orders, and deletes day-bounded Mood Intervals", async () => {
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-moods-${crypto.randomUUID()}`,
    });
    const localDate = "2026-03-29";
    const morning = await store.saveMoodEntry({
      localDate,
      mood: "Playful",
      recordedAt: new Date(2026, 2, 29, 8).toISOString(),
      subject: "dog",
    });
    const evening = await store.saveMoodEntry({
      localDate,
      mood: "Sleepy",
      recordedAt: new Date(2026, 2, 29, 20).toISOString(),
      subject: "dog",
    });

    const entries = await store.listMoodEntriesForDate(localDate);
    expect(entries.map((entry) => entry.mood)).toStrictEqual([
      "Playful",
      "Sleepy",
    ]);
    expect(getPawTrendsMoodIntervalEnd(morning, entries)).toBe(
      evening.recordedAt
    );
    expect(getPawTrendsMoodIntervalEnd(evening, entries)).toBe(
      new Date(2026, 2, 30).toISOString()
    );

    await store.saveMoodEntry({ ...morning, mood: "Tense" });
    const editedEntries = await store.listMoodEntriesForDate(localDate);
    expect(editedEntries[0]?.mood).toBe("Tense");
    await store.deleteMoodEntry(evening.id);
    await expect(store.listMoodEntriesForDate(localDate)).resolves.toHaveLength(
      1
    );
  });

  it("rejects duplicate subject timestamps but permits both subjects", async () => {
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-duplicates-${crypto.randomUUID()}`,
    });
    const recordedAt = new Date(2026, 8, 6, 12).toISOString();
    const shared = { localDate: "2026-09-06", recordedAt };
    await store.saveMoodEntry({ ...shared, mood: "Good", subject: "owner" });
    await expect(
      store.saveMoodEntry({ ...shared, mood: "Sad", subject: "owner" })
    ).rejects.toThrow("Owner Mood already exists at this time.");
    await expect(
      store.saveMoodEntry({ ...shared, mood: "Playful", subject: "dog" })
    ).resolves.toMatchObject({ subject: "dog" });
  });

  it("keeps local dates across offsets and daylight-saving boundaries", () => {
    const beforeSpringMidnight = new Date(2026, 2, 29, 0, 30);
    const afterAutumnShift = new Date(2026, 9, 25, 3, 30);
    expect(getPawTrendsLocalDate(beforeSpringMidnight)).toBe("2026-03-29");
    expect(getPawTrendsLocalDate(afterAutumnShift)).toBe("2026-10-25");

    const entry: PawTrendsMoodEntry = {
      id: "dst-entry",
      localDate: "2026-10-25",
      mood: "Anxious",
      recordedAt: afterAutumnShift.toISOString(),
      subject: "owner",
    };
    expect(getPawTrendsMoodIntervalEnd(entry, [entry])).toBe(
      new Date(2026, 9, 26).toISOString()
    );
  });

  it("stores one editable Daily Check-in per local date, including symptom-free", async () => {
    const store = createPawTrendsProbeStore({
      databaseName: `paw-trends-check-in-${crypto.randomUUID()}`,
    });
    const symptomFree = await store.saveDailyCheckIn("2026-09-06", []);
    expect(symptomFree.ownerSymptoms).toStrictEqual([]);

    const edited = await store.saveDailyCheckIn("2026-09-06", [
      "Headache",
      "Headache",
      "Fatigue",
    ]);
    expect(edited.completedAt).toBe(symptomFree.completedAt);
    expect(edited.ownerSymptoms).toStrictEqual(["Fatigue", "Headache"]);
    await expect(store.readDailyCheckIn("2026-09-06")).resolves.toStrictEqual(
      edited
    );
  });
});
