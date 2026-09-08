import { describe, expect, it } from "vite-plus/test";

import type { PawTrendsDogMood } from "@/domain/paw-trends-moods";

import type {
  PawTrendsPlainTraining,
  PawTrendsPlainWalk,
} from "./paw-trends-activity-associations-model";

import {
  calculatePawTrendsActivityAssociations,
  calculatePawTrendsPearsonCorrelation,
} from "./paw-trends-activity-associations-model";

const createPawTrendsAssociationWalk = ({
  day,
  durationMinutes,
  mood,
  withFactors = false,
}: {
  day: number;
  durationMinutes: number;
  mood: PawTrendsDogMood;
  withFactors?: boolean;
}): PawTrendsPlainWalk => ({
  activityMood: mood,
  company: withFactors ? ["Anna"] : [],
  dogSymptoms: withFactors ? ["Limping"] : [],
  durationMinutes,
  id: `walk-${day}`,
  kind: "walk",
  localDate: `2026-08-${String(day).padStart(2, "0")}`,
  place: withFactors ? "Lake11" : "Home route",
  startedAt: `2026-08-${String(day).padStart(2, "0")}T08:00:00.000Z`,
  triggerEncounters: withFactors
    ? [
        {
          id: `encounter-${day}`,
          reactionSeverity: 4,
          trigger: "Dog",
        },
      ]
    : [],
});

const createPawTrendsAssociationTraining = ({
  day,
  mood,
  withFactors,
}: {
  day: number;
  mood: PawTrendsDogMood;
  withFactors: boolean;
}): PawTrendsPlainTraining => ({
  activityMood: mood,
  dogSymptoms: withFactors ? ["Limping"] : [],
  id: `training-${day}`,
  kind: "training",
  localDate: `2026-08-${String(day).padStart(2, "0")}`,
  startedAt: `2026-08-${String(day).padStart(2, "0")}T10:00:00.000Z`,
  trainingType: withFactors ? "Mantrailing" : "Physio",
});

describe("Pearson correlation", () => {
  it("calculates positive, negative, and zero relationships", () => {
    expect(
      calculatePawTrendsPearsonCorrelation([1, 2, 3, 4], [1, 2, 3, 4])
    ).toBeCloseTo(1);
    expect(
      calculatePawTrendsPearsonCorrelation([1, 2, 3, 4], [4, 3, 2, 1])
    ).toBeCloseTo(-1);
    expect(
      calculatePawTrendsPearsonCorrelation(
        [10, 20, 30, 40, 50, 50, 40, 30, 20, 10],
        [1, 1, 1, 1, 1, 0, 0, 0, 0, 0]
      )
    ).toBe(0);
  });

  it("returns undefined when a side has no variation", () => {
    expect(
      calculatePawTrendsPearsonCorrelation([1, 1], [0, 1])
    ).toBeUndefined();
    expect(
      calculatePawTrendsPearsonCorrelation([1, 2], [1, 1])
    ).toBeUndefined();
  });
});

describe("Activity-level Associations", () => {
  it("builds Walk context Factors and compares raw values on both sides", () => {
    const walks = Array.from({ length: 10 }, (_, index) =>
      createPawTrendsAssociationWalk({
        day: index + 1,
        durationMinutes: index < 5 ? 60 : 20,
        mood: index < 5 ? "Playful" : "Tense",
        withFactors: index < 5,
      })
    );

    const associations = calculatePawTrendsActivityAssociations(walks);
    const factorNames = new Set(
      associations.map((association) => association.factor)
    );

    expect(factorNames).toStrictEqual(
      new Set([
        "Average Reaction Severity",
        "Company = Anna",
        "Dog Symptom = Limping",
        "Peak Reaction Severity",
        "Walk duration",
      ])
    );
    expect(associations).toHaveLength(10);
    const durationAssociation = associations.find(
      (association) =>
        association.factor === "Walk duration" && association.mood === "Playful"
    );
    expect(durationAssociation).toMatchObject({
      comparison: {
        difference: 40,
        format: "average",
        left: { sampleSize: 5, value: 60 },
        right: { sampleSize: 5, value: 20 },
        unit: "minutes",
      },
      direction: "positive",
      factorKind: "numeric",
      pearsonR: 1,
      timeRelationship: "On the same Walk",
    });
  });

  it("builds Trigger value Factors", () => {
    const walks = Array.from({ length: 10 }, (_, index) => ({
      ...createPawTrendsAssociationWalk({
        day: index + 1,
        durationMinutes: 30,
        mood: index < 5 ? "Playful" : "Tense",
      }),
      place: "Home route",
      triggerEncounters: [
        {
          id: `encounter-${index + 1}`,
          reactionSeverity: 2 as const,
          trigger: index < 5 ? "Dog" : "Cat",
        },
      ],
    }));

    const associations = calculatePawTrendsActivityAssociations(walks);

    expect(associations.map((association) => association.factor)).toStrictEqual(
      expect.arrayContaining(["Trigger = Cat", "Trigger = Dog"])
    );
  });

  it("builds every Walk encounter measurement", () => {
    const walks = Array.from({ length: 10 }, (_, index) => ({
      ...createPawTrendsAssociationWalk({
        day: index + 1,
        durationMinutes: 30,
        mood: index < 5 ? "Playful" : "Tense",
      }),
      place: "Home route",
      triggerEncounters:
        index < 5
          ? [
              {
                id: `encounter-${index + 1}-a`,
                reactionSeverity: 4 as const,
                trigger: "Dog",
              },
              {
                id: `encounter-${index + 1}-b`,
                reactionSeverity: 3 as const,
                trigger: "Dog",
              },
            ]
          : [
              {
                id: `encounter-${index + 1}`,
                reactionSeverity: 1 as const,
                trigger: "Dog",
              },
            ],
    }));

    const associations = calculatePawTrendsActivityAssociations(walks);

    expect(
      new Set(associations.map((association) => association.factor))
    ).toStrictEqual(
      new Set([
        "Average Reaction Severity",
        "Peak Reaction Severity",
        "Reactive Encounters",
        "Total Trigger Encounters",
      ])
    );
  });

  it("builds Training Type and Dog Symptom Factors", () => {
    const trainings = Array.from({ length: 10 }, (_, index) =>
      createPawTrendsAssociationTraining({
        day: index + 1,
        mood: index < 5 ? "Playful" : "Sleepy",
        withFactors: index < 5,
      })
    );

    const associations = calculatePawTrendsActivityAssociations(trainings);

    expect(associations.map((association) => association.factor)).toStrictEqual(
      expect.arrayContaining([
        "Dog Symptom = Limping",
        "Training Type = Mantrailing",
        "Training Type = Physio",
      ])
    );
    expect(associations[0]?.timeRelationship).toBe("On the same Training");
  });

  it("rejects moods and binary Factors that miss either five-sample side", () => {
    const tooFewActivities = Array.from({ length: 9 }, (_, index) =>
      createPawTrendsAssociationWalk({
        day: index + 1,
        durationMinutes: index + 10,
        mood: index < 5 ? "Playful" : "Tense",
      })
    );
    const rareFactorActivities = Array.from({ length: 10 }, (_, index) =>
      createPawTrendsAssociationWalk({
        day: index + 1,
        durationMinutes: index + 10,
        mood: index < 5 ? "Playful" : "Tense",
        withFactors: index < 4,
      })
    );

    expect(
      calculatePawTrendsActivityAssociations(tooFewActivities)
    ).toStrictEqual([]);
    expect(
      calculatePawTrendsActivityAssociations(rareFactorActivities).some(
        (association) => association.factor === "Company = Anna"
      )
    ).toBeFalsy();
  });

  it("keeps zero-strength results and breaks equal-strength ties by stable key", () => {
    const durations = [10, 20, 30, 40, 50, 50, 40, 30, 20, 10];
    const walks = durations.map((durationMinutes, index) =>
      createPawTrendsAssociationWalk({
        day: index + 1,
        durationMinutes,
        mood: index < 5 ? "Playful" : "Tense",
      })
    );

    const associations = calculatePawTrendsActivityAssociations(walks);

    expect(associations).toHaveLength(2);
    expect(associations.map((association) => association.mood)).toStrictEqual([
      "Playful",
      "Tense",
    ]);
    expect(
      associations.every((association) => association.strength === 0)
    ).toBeTruthy();
  });
});
