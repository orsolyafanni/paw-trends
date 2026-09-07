import type {
  PawTrendsHistoryRecord,
  PawTrendsMoodSubject,
} from "@/persistence/paw-trends-probe-store";

export const PAW_TRENDS_HISTORY_ENTRY_TYPES = [
  "all",
  "walk",
  "training",
  "dog-mood",
  "owner-mood",
  "check-in",
] as const;

export type PawTrendsHistoryEntryType =
  (typeof PAW_TRENDS_HISTORY_ENTRY_TYPES)[number];

export interface PawTrendsHistoryDayGroup {
  localDate: string;
  records: PawTrendsHistoryRecord[];
}

export interface PawTrendsHistoryFilters {
  fromDate: string;
  toDate: string;
  type: PawTrendsHistoryEntryType;
}

/** Returns the stored local calendar day without recalculating it from UTC. */
export const getPawTrendsHistoryRecordLocalDate = (
  entry: PawTrendsHistoryRecord
): string => entry.record.localDate;

/** Returns the observation time used to order entries inside a local day. */
export const getPawTrendsHistoryRecordTimestamp = (
  entry: PawTrendsHistoryRecord
): string => {
  if (entry.kind === "check-in") {
    return entry.record.updatedAt;
  }
  if (entry.kind === "mood") {
    return entry.record.recordedAt;
  }
  return entry.record.startedAt;
};

const matchesPawTrendsMoodSubject = (
  entry: PawTrendsHistoryRecord,
  subject: PawTrendsMoodSubject
): boolean => entry.kind === "mood" && entry.record.subject === subject;

/** Filters History inclusively by stored local day and one entry type. */
export const filterPawTrendsHistoryRecords = (
  records: readonly PawTrendsHistoryRecord[],
  filters: PawTrendsHistoryFilters
): PawTrendsHistoryRecord[] =>
  records.filter((entry) => {
    const localDate = getPawTrendsHistoryRecordLocalDate(entry);
    const dateMatches =
      (!filters.fromDate || localDate >= filters.fromDate) &&
      (!filters.toDate || localDate <= filters.toDate);
    if (!dateMatches || filters.type === "all") {
      return dateMatches;
    }
    if (filters.type === "dog-mood") {
      return matchesPawTrendsMoodSubject(entry, "dog");
    }
    if (filters.type === "owner-mood") {
      return matchesPawTrendsMoodSubject(entry, "owner");
    }
    return entry.kind === filters.type;
  });

/** Groups filtered History entries by local day in reverse chronological order. */
export const groupPawTrendsHistoryRecordsByDay = (
  records: readonly PawTrendsHistoryRecord[]
): PawTrendsHistoryDayGroup[] => {
  const recordsByDay = new Map<string, PawTrendsHistoryRecord[]>();
  for (const entry of records) {
    const localDate = getPawTrendsHistoryRecordLocalDate(entry);
    const dayRecords = recordsByDay.get(localDate) ?? [];
    dayRecords.push(entry);
    recordsByDay.set(localDate, dayRecords);
  }
  return [...recordsByDay.entries()]
    .toSorted(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
    .map(([localDate, dayRecords]) => ({
      localDate,
      records: dayRecords.toSorted((left, right) =>
        getPawTrendsHistoryRecordTimestamp(right).localeCompare(
          getPawTrendsHistoryRecordTimestamp(left)
        )
      ),
    }));
};

/** Keeps Undo available until, but not after, its deadline. */
export const isPawTrendsHistoryUndoAvailable = (
  deadlineMilliseconds: number,
  nowMilliseconds: number
): boolean => nowMilliseconds <= deadlineMilliseconds;
