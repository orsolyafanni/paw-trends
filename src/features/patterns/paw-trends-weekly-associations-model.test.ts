import { describe, expect, it } from "vite-plus/test";

import type { PawTrendsDogMood } from "@/domain/paw-trends-moods";

import { calculatePawTrendsActivityAssociationCandidates } from "./paw-trends-activity-associations-model";
import type {
  PawTrendsPlainTraining,
  PawTrendsPlainWalk,
} from "./paw-trends-activity-associations-model";
import {
  calculatePawTrendsAssociations,
  calculatePawTrendsDayAssociationCandidates,
  differencePawTrendsLocalCalendarDays,
  listPawTrendsTrainingRecencySamples,
  summarizePawTrendsFactorWindow,
} from "./paw-trends-weekly-associations-model";
import type {
  PawTrendsAssociationRecords,
  PawTrendsPlainMoodEntry,
} from "./paw-trends-weekly-associations-model";

const createPawTrendsWeeklyWalk = ({
  date,
  durationMinutes,
  mood = "Playful",
}: {
  date: string;
  durationMinutes: number;
  mood?: PawTrendsDogMood;
}): PawTrendsPlainWalk => ({
  activityMood: mood,
  company: [],
  dogSymptoms: [],
  durationMinutes,
  id: `walk-${date}`,
  kind: "walk",
  localDate: date,
  place: "Home route",
  startedAt: `${date}T08:00:00.000Z`,
  triggerEncounters: [],
});

const createPawTrendsWeeklyTraining = (
  date: string,
  trainingType = "Physio"
): PawTrendsPlainTraining => ({
  activityMood: "Sleepy",
  dogSymptoms: [],
  id: `training-${trainingType}-${date}`,
  kind: "training",
  localDate: date,
  startedAt: `${date}T17:00:00.000Z`,
  trainingType,
});

const createPawTrendsDogMoodEntry = (
  date: string,
  mood: PawTrendsDogMood,
  suffix = "one"
): PawTrendsPlainMoodEntry => ({
  id: `dog-mood-${date}-${suffix}`,
  localDate: date,
  mood,
  recordedAt: `${date}T09:00:00.000Z`,
  subject: "dog",
});

const createPawTrendsSpacedObservedDates = (): string[] =>
  Array.from({ length: 10 }, (_, index) =>
    new Date(Date.UTC(2026, 0, 1 + index * 8)).toISOString().slice(0, 10)
  );

describe("seven-day Paw Trends Factor Windows", () => {
  it("includes the Observed Day and six prior local dates in every aggregation", () => {
    const includedWalk = {
      ...createPawTrendsWeeklyWalk({
        date: "2026-03-04",
        durationMinutes: 20,
      }),
      company: ["Anna"],
      dogSymptoms: ["Limping"],
      place: "Lake11",
      triggerEncounters: [
        { id: "encounter-zero", reactionSeverity: 0, trigger: "Dog" },
        { id: "encounter-four", reactionSeverity: 4, trigger: "Cat" },
      ],
    } satisfies PawTrendsPlainWalk;
    const observedDayWalk = {
      ...createPawTrendsWeeklyWalk({
        date: "2026-03-10",
        durationMinutes: 30,
      }),
      company: ["Anna"],
      triggerEncounters: [
        { id: "encounter-three", reactionSeverity: 3, trigger: "Dog" },
      ],
    } satisfies PawTrendsPlainWalk;
    const training = {
      ...createPawTrendsWeeklyTraining("2026-03-05"),
      dogSymptoms: ["Limping"],
    } satisfies PawTrendsPlainTraining;
    const excludedWalk = {
      ...createPawTrendsWeeklyWalk({
        date: "2026-03-03",
        durationMinutes: 999,
      }),
      triggerEncounters: [
        { id: "excluded", reactionSeverity: 5, trigger: "Horse" },
      ],
    } satisfies PawTrendsPlainWalk;
    const records: PawTrendsAssociationRecords = {
      activities: [includedWalk, observedDayWalk, training, excludedWalk],
      checkIns: [
        { localDate: "2026-03-03", ownerSymptoms: ["Migraine"] },
        { localDate: "2026-03-04", ownerSymptoms: ["Migraine"] },
        { localDate: "2026-03-09", ownerSymptoms: ["Migraine"] },
        { localDate: "2026-03-10", ownerSymptoms: [] },
      ],
      moodEntries: [
        {
          id: "owner-relaxed-one",
          localDate: "2026-03-04",
          mood: "Relaxed",
          recordedAt: "2026-03-04T08:00:00.000Z",
          subject: "owner",
        },
        {
          id: "owner-relaxed-two",
          localDate: "2026-03-04",
          mood: "Relaxed",
          recordedAt: "2026-03-04T18:00:00.000Z",
          subject: "owner",
        },
        {
          id: "owner-relaxed-three",
          localDate: "2026-03-09",
          mood: "Relaxed",
          recordedAt: "2026-03-09T08:00:00.000Z",
          subject: "owner",
        },
        {
          id: "owner-anxious",
          localDate: "2026-03-10",
          mood: "Anxious",
          recordedAt: "2026-03-10T08:00:00.000Z",
          subject: "owner",
        },
      ],
    };

    const summary = summarizePawTrendsFactorWindow("2026-03-10", records);

    expect(summary).toMatchObject({
      activityTypeCounts: { Training: 1, Walk: 2 },
      averageReactionSeverity: 7 / 3,
      ownerSymptomDayCounts: { migraine: 2 },
      ownerMoodDayCounts: { Anxious: 1, Relaxed: 2 },
      peakReactionSeverity: 4,
      reactiveEncounterCount: 2,
      totalEncounterCount: 3,
      triggerEncounterCounts: { cat: 1, dog: 2 },
      walkDurationMinutes: 50,
    });
    expect(summary.placeActivityCounts).toMatchObject({
      "home route": 1,
      lake11: 1,
    });
    expect(summary.companyActivityCounts).toMatchObject({ anna: 2 });
    expect(summary.dogSymptomActivityCounts).toMatchObject({ limping: 2 });
    expect(summary.trainingTypeActivityCounts).toMatchObject({ physio: 1 });
  });

  it("counts calendar dates exactly across leap days and daylight-saving seasons", () => {
    expect(
      differencePawTrendsLocalCalendarDays("2028-03-01", "2028-02-28")
    ).toBe(2);
    expect(
      differencePawTrendsLocalCalendarDays("2026-10-26", "2026-10-24")
    ).toBe(2);
  });
});

describe("Training recency", () => {
  it("excludes dates before the first Training and uses the latest matching local date", () => {
    const samples = listPawTrendsTrainingRecencySamples(
      ["2026-08-01", "2026-08-03", "2026-08-31", "2026-09-02"],
      [
        createPawTrendsWeeklyTraining("2026-08-03"),
        createPawTrendsWeeklyTraining("2026-09-01"),
        createPawTrendsWeeklyTraining("2026-08-20", "Mantrailing"),
      ],
      "Physio"
    );

    expect(samples).toStrictEqual([
      { daysSinceTraining: 0, localDate: "2026-08-03" },
      { daysSinceTraining: 28, localDate: "2026-08-31" },
      { daysSinceTraining: 1, localDate: "2026-09-02" },
    ]);
  });

  it("uses eligible recency samples in day-level raw comparisons", () => {
    const observedDates = Array.from(
      { length: 12 },
      (_, index) => `2026-01-${String(index + 1).padStart(2, "0")}`
    );
    const records: PawTrendsAssociationRecords = {
      activities: [
        createPawTrendsWeeklyTraining("2026-01-03"),
        createPawTrendsWeeklyTraining("2026-01-09"),
      ],
      checkIns: [],
      moodEntries: observedDates.map((date, index) =>
        createPawTrendsDogMoodEntry(
          date,
          index >= 2 && index < 7 ? "Playful" : "Tense"
        )
      ),
    };

    const association = calculatePawTrendsDayAssociationCandidates(
      records
    ).find(
      (candidate) =>
        candidate.factor === "Days since Physio Training" &&
        candidate.mood === "Playful"
    );

    expect(association?.samples).toHaveLength(10);
    expect(association?.samples[0]).toMatchObject({
      factorValue: 0,
      localDate: "2026-01-03",
    });
    expect(association?.samples.at(-1)).toMatchObject({
      factorValue: 3,
      localDate: "2026-01-12",
    });
    expect(association?.comparison.left.sampleSize).toBe(5);
    expect(association?.comparison.right.sampleSize).toBe(5);
  });
});

describe("day-level and global Paw Trends Association ranking", () => {
  const createEligiblePawTrendsRecords = (): PawTrendsAssociationRecords => {
    const dates = createPawTrendsSpacedObservedDates();
    return {
      activities: dates.map((date, index) =>
        createPawTrendsWeeklyWalk({
          date,
          durationMinutes: index < 5 ? 60 : 20,
          mood: index < 5 ? "Playful" : "Tense",
        })
      ),
      checkIns: [],
      moodEntries: dates.flatMap((date, index) => [
        createPawTrendsDogMoodEntry(date, index < 5 ? "Playful" : "Tense"),
        ...(index === 0
          ? [createPawTrendsDogMoodEntry(date, "Playful", "two")]
          : []),
      ]),
    };
  };

  it("uses one binary Daily Mood Presence outcome per Observed Day", () => {
    const records = createEligiblePawTrendsRecords();
    const durationAssociation = calculatePawTrendsDayAssociationCandidates(
      records
    ).find(
      (association) =>
        association.factor === "Walk duration" && association.mood === "Playful"
    );

    expect(durationAssociation).toMatchObject({
      comparison: {
        difference: 40,
        left: { sampleSize: 5, value: 60 },
        right: { sampleSize: 5, value: 20 },
        unit: "minutes",
      },
      level: "day",
      pearsonR: 1,
      timeRelationship: "Across the 7-day Factor Window",
    });
    expect(durationAssociation?.samples).toHaveLength(10);
    expect(
      durationAssociation?.samples.filter((sample) => sample.moodPresent)
    ).toHaveLength(5);
  });

  it("excludes Factors without variation or enough outcome samples", () => {
    const dates = createPawTrendsSpacedObservedDates();
    const constantRecords: PawTrendsAssociationRecords = {
      activities: dates.map((date) =>
        createPawTrendsWeeklyWalk({ date, durationMinutes: 30 })
      ),
      checkIns: [],
      moodEntries: dates.map((date) =>
        createPawTrendsDogMoodEntry(date, "Playful")
      ),
    };

    expect(
      calculatePawTrendsDayAssociationCandidates(constantRecords)
    ).toStrictEqual([]);
  });

  it("ranks activity and day candidates together with one stable top ten", () => {
    const records = createEligiblePawTrendsRecords();
    const activityCandidates = calculatePawTrendsActivityAssociationCandidates(
      records.activities
    );
    const dayCandidates = calculatePawTrendsDayAssociationCandidates(records);
    const ranked = calculatePawTrendsAssociations(records);
    const allCandidates = [...activityCandidates, ...dayCandidates].toSorted(
      (left, right) =>
        right.strength - left.strength ||
        right.samples.length - left.samples.length ||
        left.stableKey.localeCompare(right.stableKey, "en-US")
    );

    expect(ranked).toHaveLength(Math.min(10, allCandidates.length));
    expect(ranked.map((association) => association.stableKey)).toStrictEqual(
      allCandidates.slice(0, 10).map((association) => association.stableKey)
    );
    expect(
      new Set(ranked.map((association) => association.level))
    ).toStrictEqual(new Set(["activity", "day"]));
  });
});
