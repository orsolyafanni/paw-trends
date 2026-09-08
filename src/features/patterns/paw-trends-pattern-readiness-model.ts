import type {
  PawTrendsDogMood,
  PawTrendsHistoryRecord,
} from "@/persistence/paw-trends-probe-store";
import { PAW_TRENDS_DOG_MOODS } from "@/persistence/paw-trends-probe-store";

export interface PawTrendsMoodSampleCounts {
  activitySamplesWithMood: number;
  activitySamplesWithoutMood: number;
  observedDaysWithMood: number;
  observedDaysWithoutMood: number;
}

export interface PawTrendsPatternReadiness {
  completedDailyCheckIns: number;
  dogMoodOccurrences: Record<PawTrendsDogMood, number>;
  moodSampleCounts: Record<PawTrendsDogMood, PawTrendsMoodSampleCounts>;
  moodSampleThresholdReached: boolean;
  observedDays: number;
  totalRecords: number;
  trainingSessions: number;
  walks: number;
}

const PAW_TRENDS_MINIMUM_MOOD_SIDE_SAMPLES = 5;

const createEmptyPawTrendsDogMoodCounts = (): Record<
  PawTrendsDogMood,
  number
> => ({
  Aggressive: 0,
  Grumpy: 0,
  "Hate-the-world": 0,
  Overwhelmed: 0,
  Playful: 0,
  Sleepy: 0,
  Tense: 0,
});

function createEmptyPawTrendsMoodSideCounts(): PawTrendsMoodSampleCounts {
  return {
    activitySamplesWithMood: 0,
    activitySamplesWithoutMood: 0,
    observedDaysWithMood: 0,
    observedDaysWithoutMood: 0,
  };
}

const createEmptyPawTrendsMoodSampleCounts = (): Record<
  PawTrendsDogMood,
  PawTrendsMoodSampleCounts
> => ({
  Aggressive: createEmptyPawTrendsMoodSideCounts(),
  Grumpy: createEmptyPawTrendsMoodSideCounts(),
  "Hate-the-world": createEmptyPawTrendsMoodSideCounts(),
  Overwhelmed: createEmptyPawTrendsMoodSideCounts(),
  Playful: createEmptyPawTrendsMoodSideCounts(),
  Sleepy: createEmptyPawTrendsMoodSideCounts(),
  Tense: createEmptyPawTrendsMoodSideCounts(),
});

const isPawTrendsDogMood = (mood: string): mood is PawTrendsDogMood =>
  PAW_TRENDS_DOG_MOODS.some((candidate) => candidate === mood);

/** Checks only the five-with-mood and five-without-mood sample gate. */
export const hasPawTrendsMoodSampleThreshold = (
  counts: PawTrendsMoodSampleCounts
): boolean =>
  (counts.activitySamplesWithMood >= PAW_TRENDS_MINIMUM_MOOD_SIDE_SAMPLES &&
    counts.activitySamplesWithoutMood >=
      PAW_TRENDS_MINIMUM_MOOD_SIDE_SAMPLES) ||
  (counts.observedDaysWithMood >= PAW_TRENDS_MINIMUM_MOOD_SIDE_SAMPLES &&
    counts.observedDaysWithoutMood >= PAW_TRENDS_MINIMUM_MOOD_SIDE_SAMPLES);

/** Summarizes stored observations without calculating or ranking Associations. */
export const calculatePawTrendsPatternReadiness = (
  records: readonly PawTrendsHistoryRecord[]
): PawTrendsPatternReadiness => {
  const activities = records.filter(
    (
      entry
    ): entry is Extract<
      PawTrendsHistoryRecord,
      { kind: "training" | "walk" }
    > => entry.kind === "training" || entry.kind === "walk"
  );
  const dogMoodEntries = records.filter(
    (entry): entry is Extract<PawTrendsHistoryRecord, { kind: "mood" }> =>
      entry.kind === "mood" && entry.record.subject === "dog"
  );
  const moodsByObservedDay = new Map<string, Set<PawTrendsDogMood>>();
  const dogMoodOccurrences = createEmptyPawTrendsDogMoodCounts();

  for (const entry of dogMoodEntries) {
    if (!isPawTrendsDogMood(entry.record.mood)) {
      continue;
    }
    dogMoodOccurrences[entry.record.mood] += 1;
    const moodsForDay =
      moodsByObservedDay.get(entry.record.localDate) ?? new Set();
    moodsForDay.add(entry.record.mood);
    moodsByObservedDay.set(entry.record.localDate, moodsForDay);
  }

  const moodSampleCounts = createEmptyPawTrendsMoodSampleCounts();

  for (const mood of PAW_TRENDS_DOG_MOODS) {
    const activitySamplesWithMood = activities.filter(
      (entry) => entry.record.activityMood === mood
    ).length;
    const observedDaysWithMood = [...moodsByObservedDay.values()].filter(
      (moods) => moods.has(mood)
    ).length;
    moodSampleCounts[mood] = {
      activitySamplesWithMood,
      activitySamplesWithoutMood: activities.length - activitySamplesWithMood,
      observedDaysWithMood,
      observedDaysWithoutMood: moodsByObservedDay.size - observedDaysWithMood,
    };
  }

  return {
    completedDailyCheckIns: records.filter((entry) => entry.kind === "check-in")
      .length,
    dogMoodOccurrences,
    moodSampleCounts,
    moodSampleThresholdReached: PAW_TRENDS_DOG_MOODS.some((mood) =>
      hasPawTrendsMoodSampleThreshold(moodSampleCounts[mood])
    ),
    observedDays: moodsByObservedDay.size,
    totalRecords: records.length,
    trainingSessions: activities.filter((entry) => entry.kind === "training")
      .length,
    walks: activities.filter((entry) => entry.kind === "walk").length,
  };
};
