import { describe, expect, it } from "vite-plus/test";

import type { PawTrendsHistoryRecord } from "@/persistence/paw-trends-probe-store";

import {
  filterPawTrendsHistoryRecords,
  groupPawTrendsHistoryRecordsByDay,
  isPawTrendsHistoryUndoAvailable,
} from "./paw-trends-history-model";

const HISTORY_RECORDS: PawTrendsHistoryRecord[] = [
  {
    kind: "mood",
    record: {
      id: "late-dog-mood",
      localDate: "2026-03-29",
      mood: "Tense",
      recordedAt: "2026-03-28T23:30:00.000Z",
      subject: "dog",
    },
  },
  {
    kind: "mood",
    record: {
      id: "early-owner-mood",
      localDate: "2026-03-29",
      mood: "Relaxed",
      recordedAt: "2026-03-29T00:30:00.000Z",
      subject: "owner",
    },
  },
  {
    kind: "training",
    record: {
      activityMood: "Playful",
      createdAt: "2026-03-20T08:00:00.000Z",
      dogSymptoms: [],
      id: "backdated-training",
      kind: "training",
      localDate: "2026-03-20",
      startedAt: "2026-03-20T08:00:00.000Z",
      trainingType: "Physio",
      updatedAt: "2026-03-29T08:00:00.000Z",
    },
  },
];

const getHistoryTestRecordId = (entry: PawTrendsHistoryRecord): string =>
  entry.kind === "check-in" ? entry.record.localDate : entry.record.id;

describe("Paw Trends History model", () => {
  it("groups backdated entries by stored local day across timezone boundaries", () => {
    const groups = groupPawTrendsHistoryRecordsByDay(HISTORY_RECORDS);

    expect(groups.map((group) => group.localDate)).toStrictEqual([
      "2026-03-29",
      "2026-03-20",
    ]);
    expect(groups[0]?.records.map(getHistoryTestRecordId)).toStrictEqual([
      "early-owner-mood",
      "late-dog-mood",
    ]);
  });

  it("combines an inclusive date range with each mood subject filter", () => {
    const dogMoods = filterPawTrendsHistoryRecords(HISTORY_RECORDS, {
      fromDate: "2026-03-29",
      toDate: "2026-03-29",
      type: "dog-mood",
    });
    const trainings = filterPawTrendsHistoryRecords(HISTORY_RECORDS, {
      fromDate: "2026-03-20",
      toDate: "2026-03-28",
      type: "training",
    });

    expect(dogMoods.map(getHistoryTestRecordId)).toStrictEqual([
      "late-dog-mood",
    ]);
    expect(trainings.map(getHistoryTestRecordId)).toStrictEqual([
      "backdated-training",
    ]);
  });

  it("expires Undo at its deadline", () => {
    expect(isPawTrendsHistoryUndoAvailable(6000, 5999)).toBeTruthy();
    expect(isPawTrendsHistoryUndoAvailable(6000, 6000)).toBeTruthy();
    expect(isPawTrendsHistoryUndoAvailable(6000, 6001)).toBeFalsy();
  });
});
