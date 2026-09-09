import { PAW_TRENDS_DOG_MOODS } from "@/domain/paw-trends-moods";
import type { PawTrendsDogMood } from "@/domain/paw-trends-moods";

export interface PawTrendsPlainTriggerEncounter {
  id: string;
  reactionSeverity: number;
  trigger: string;
}

export interface PawTrendsPlainWalk {
  activityMood: PawTrendsDogMood;
  company: readonly string[];
  dogSymptoms: readonly string[];
  durationMinutes: number;
  id: string;
  kind: "walk";
  localDate: string;
  place: string;
  startedAt: string;
  triggerEncounters: readonly PawTrendsPlainTriggerEncounter[];
}

export interface PawTrendsPlainTraining {
  activityMood: PawTrendsDogMood;
  dogSymptoms: readonly string[];
  id: string;
  kind: "training";
  localDate: string;
  startedAt: string;
  trainingType: string;
}

export type PawTrendsPlainActivity =
  | PawTrendsPlainTraining
  | PawTrendsPlainWalk;

export interface PawTrendsAssociationSample {
  activityId: string;
  activityKind: "Training" | "Walk";
  activityMood: PawTrendsDogMood;
  factorValue: number;
  localDate: string;
  sampleKind: "activity";
  startedAt: string;
}

export interface PawTrendsAssociationComparisonSide {
  label: string;
  sampleSize: number;
  value: number;
}

export interface PawTrendsActivityAssociation {
  comparison: {
    difference: number;
    format: "average" | "percentage";
    left: PawTrendsAssociationComparisonSide;
    right: PawTrendsAssociationComparisonSide;
    unit: string;
  };
  direction: "negative" | "positive" | "zero";
  factor: string;
  factorKind: "binary" | "numeric";
  level: "activity";
  mood: PawTrendsDogMood;
  pearsonR: number;
  samples: PawTrendsAssociationSample[];
  stableKey: string;
  strength: number;
  timeRelationship: "On the same Training" | "On the same Walk";
}

interface PawTrendsActivityFactor {
  activityKind: "training" | "walk";
  factorKind: "binary" | "numeric";
  key: string;
  label: string;
  readValue: (activity: PawTrendsPlainActivity) => number;
  unit: string;
}

export const PAW_TRENDS_MINIMUM_ASSOCIATION_SIDE_SAMPLES = 5;
export const PAW_TRENDS_MAXIMUM_ASSOCIATIONS = 10;

const meanPawTrendsValues = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/** Calculates Pearson's correlation coefficient, or undefined when either side has no variation. */
export function calculatePawTrendsPearsonCorrelation(
  factorValues: readonly number[],
  outcomeValues: readonly number[]
): number | undefined {
  if (factorValues.length !== outcomeValues.length || factorValues.length < 2) {
    return undefined;
  }

  const factorMean = meanPawTrendsValues(factorValues);
  const outcomeMean = meanPawTrendsValues(outcomeValues);
  let covariance = 0;
  let factorSquaredDifference = 0;
  let outcomeSquaredDifference = 0;

  for (const [index, factorValue] of factorValues.entries()) {
    const factorDifference = factorValue - factorMean;
    const outcomeDifference = outcomeValues[index] - outcomeMean;
    covariance += factorDifference * outcomeDifference;
    factorSquaredDifference += factorDifference ** 2;
    outcomeSquaredDifference += outcomeDifference ** 2;
  }

  const denominator = Math.sqrt(
    factorSquaredDifference * outcomeSquaredDifference
  );
  if (denominator === 0) {
    return undefined;
  }

  const correlation = covariance / denominator;
  return Math.abs(correlation) < Number.EPSILON ? 0 : correlation;
}

const normalizePawTrendsFactorValueKey = (value: string): string =>
  value.trim().toLocaleLowerCase("en-US");

const listPawTrendsFactorValues = (
  values: readonly string[]
): readonly string[] =>
  [
    ...new Map(
      values.map((value) => [
        normalizePawTrendsFactorValueKey(value),
        value.trim(),
      ])
    ).values(),
  ].toSorted((left, right) => left.localeCompare(right, "en-US"));

const hasPawTrendsLabel = (
  values: readonly string[],
  expectedValue: string
): boolean => {
  const normalizedExpectedValue =
    normalizePawTrendsFactorValueKey(expectedValue);
  return values.some(
    (value) =>
      normalizePawTrendsFactorValueKey(value) === normalizedExpectedValue
  );
};

const createPawTrendsBinaryFactor = ({
  activityKind,
  category,
  label,
  readValues,
}: {
  activityKind: "training" | "walk";
  category: string;
  label: string;
  readValues: (activity: PawTrendsPlainActivity) => readonly string[];
}): PawTrendsActivityFactor => ({
  activityKind,
  factorKind: "binary",
  key: `${activityKind}:${category}:${normalizePawTrendsFactorValueKey(label)}`,
  label: `${category} = ${label}`,
  readValue: (activity) =>
    hasPawTrendsLabel(readValues(activity), label) ? 1 : 0,
  unit: "percentage points",
});

const createPawTrendsActivityFactors = (
  activities: readonly PawTrendsPlainActivity[]
): PawTrendsActivityFactor[] => {
  const walks = activities.filter(
    (activity): activity is PawTrendsPlainWalk => activity.kind === "walk"
  );
  const trainings = activities.filter(
    (activity): activity is PawTrendsPlainTraining =>
      activity.kind === "training"
  );
  const factors: PawTrendsActivityFactor[] = [];

  for (const place of listPawTrendsFactorValues(
    walks.map((walk) => walk.place)
  )) {
    factors.push(
      createPawTrendsBinaryFactor({
        activityKind: "walk",
        category: "Place",
        label: place,
        readValues: (activity) =>
          activity.kind === "walk" ? [activity.place] : [],
      })
    );
  }

  const walkCategoricalFactors = [
    {
      category: "Company",
      values: walks.flatMap((walk) => walk.company),
      readValues: (activity: PawTrendsPlainActivity) =>
        activity.kind === "walk" ? activity.company : [],
    },
    {
      category: "Trigger",
      values: walks.flatMap((walk) =>
        walk.triggerEncounters.map((encounter) => encounter.trigger)
      ),
      readValues: (activity: PawTrendsPlainActivity) =>
        activity.kind === "walk"
          ? activity.triggerEncounters.map((encounter) => encounter.trigger)
          : [],
    },
    {
      category: "Dog Symptom",
      values: walks.flatMap((walk) => walk.dogSymptoms),
      readValues: (activity: PawTrendsPlainActivity) =>
        activity.kind === "walk" ? activity.dogSymptoms : [],
    },
  ];
  for (const category of walkCategoricalFactors) {
    for (const label of listPawTrendsFactorValues(category.values)) {
      factors.push(
        createPawTrendsBinaryFactor({
          activityKind: "walk",
          category: category.category,
          label,
          readValues: category.readValues,
        })
      );
    }
  }

  const walkNumericFactors: readonly Omit<
    PawTrendsActivityFactor,
    "activityKind" | "factorKind"
  >[] = [
    {
      key: "walk:duration-minutes",
      label: "Walk duration",
      readValue: (activity) =>
        activity.kind === "walk" ? activity.durationMinutes : 0,
      unit: "minutes",
    },
    {
      key: "walk:total-trigger-encounters",
      label: "Total Trigger Encounters",
      readValue: (activity) =>
        activity.kind === "walk" ? activity.triggerEncounters.length : 0,
      unit: "encounters",
    },
    {
      key: "walk:reactive-encounters",
      label: "Reactive Encounters",
      readValue: (activity) =>
        activity.kind === "walk"
          ? activity.triggerEncounters.filter(
              (encounter) => encounter.reactionSeverity >= 3
            ).length
          : 0,
      unit: "encounters",
    },
    {
      key: "walk:average-reaction-severity",
      label: "Average Reaction Severity",
      readValue: (activity) => {
        if (
          activity.kind !== "walk" ||
          activity.triggerEncounters.length === 0
        ) {
          return 0;
        }
        return meanPawTrendsValues(
          activity.triggerEncounters.map(
            (encounter) => encounter.reactionSeverity
          )
        );
      },
      unit: "severity points",
    },
    {
      key: "walk:peak-reaction-severity",
      label: "Peak Reaction Severity",
      readValue: (activity) =>
        activity.kind === "walk"
          ? Math.max(
              0,
              ...activity.triggerEncounters.map(
                (encounter) => encounter.reactionSeverity
              )
            )
          : 0,
      unit: "severity points",
    },
  ];
  factors.push(
    ...walkNumericFactors.map((factor) => ({
      ...factor,
      activityKind: "walk" as const,
      factorKind: "numeric" as const,
    }))
  );

  for (const trainingType of listPawTrendsFactorValues(
    trainings.map((training) => training.trainingType)
  )) {
    factors.push(
      createPawTrendsBinaryFactor({
        activityKind: "training",
        category: "Training Type",
        label: trainingType,
        readValues: (activity) =>
          activity.kind === "training" ? [activity.trainingType] : [],
      })
    );
  }
  for (const symptom of listPawTrendsFactorValues(
    trainings.flatMap((training) => training.dogSymptoms)
  )) {
    factors.push(
      createPawTrendsBinaryFactor({
        activityKind: "training",
        category: "Dog Symptom",
        label: symptom,
        readValues: (activity) =>
          activity.kind === "training" ? activity.dogSymptoms : [],
      })
    );
  }

  return factors;
};

const createPawTrendsAssociation = (
  activities: readonly PawTrendsPlainActivity[],
  factor: PawTrendsActivityFactor,
  mood: PawTrendsDogMood
): PawTrendsActivityAssociation | undefined => {
  const matchingActivities = activities.filter(
    (activity) => activity.kind === factor.activityKind
  );
  const factorValues = matchingActivities.map(factor.readValue);
  const outcomeValues = matchingActivities.map((activity) =>
    activity.activityMood === mood ? 1 : 0
  );
  const moodSampleSize = outcomeValues.filter((value) => value === 1).length;
  const withoutMoodSampleSize = outcomeValues.length - moodSampleSize;
  if (
    matchingActivities.length <
      PAW_TRENDS_MINIMUM_ASSOCIATION_SIDE_SAMPLES * 2 ||
    moodSampleSize < PAW_TRENDS_MINIMUM_ASSOCIATION_SIDE_SAMPLES ||
    withoutMoodSampleSize < PAW_TRENDS_MINIMUM_ASSOCIATION_SIDE_SAMPLES
  ) {
    return undefined;
  }

  if (factor.factorKind === "binary") {
    const presentSampleSize = factorValues.filter(
      (value) => value === 1
    ).length;
    if (
      presentSampleSize < PAW_TRENDS_MINIMUM_ASSOCIATION_SIDE_SAMPLES ||
      factorValues.length - presentSampleSize <
        PAW_TRENDS_MINIMUM_ASSOCIATION_SIDE_SAMPLES
    ) {
      return undefined;
    }
  }

  const pearsonR = calculatePawTrendsPearsonCorrelation(
    factorValues,
    outcomeValues
  );
  if (pearsonR === undefined) {
    return undefined;
  }

  const samples = matchingActivities.map((activity, index) => ({
    activityId: activity.id,
    activityKind:
      activity.kind === "walk" ? ("Walk" as const) : ("Training" as const),
    activityMood: activity.activityMood,
    factorValue: factorValues[index],
    localDate: activity.localDate,
    sampleKind: "activity" as const,
    startedAt: activity.startedAt,
  }));
  let comparison: PawTrendsActivityAssociation["comparison"];
  if (factor.factorKind === "binary") {
    const presentOutcomes = outcomeValues.filter(
      (_, index) => factorValues[index] === 1
    );
    const absentOutcomes = outcomeValues.filter(
      (_, index) => factorValues[index] === 0
    );
    const presentRate = meanPawTrendsValues(presentOutcomes) * 100;
    const absentRate = meanPawTrendsValues(absentOutcomes) * 100;
    comparison = {
      difference: presentRate - absentRate,
      format: "percentage",
      left: {
        label: "Factor present",
        sampleSize: presentOutcomes.length,
        value: presentRate,
      },
      right: {
        label: "Factor absent",
        sampleSize: absentOutcomes.length,
        value: absentRate,
      },
      unit: "percentage points",
    };
  } else {
    const valuesWithMood = factorValues.filter(
      (_, index) => outcomeValues[index] === 1
    );
    const valuesWithoutMood = factorValues.filter(
      (_, index) => outcomeValues[index] === 0
    );
    const averageWithMood = meanPawTrendsValues(valuesWithMood);
    const averageWithoutMood = meanPawTrendsValues(valuesWithoutMood);
    comparison = {
      difference: averageWithMood - averageWithoutMood,
      format: "average",
      left: {
        label: `${mood} activities`,
        sampleSize: valuesWithMood.length,
        value: averageWithMood,
      },
      right: {
        label: `Other moods`,
        sampleSize: valuesWithoutMood.length,
        value: averageWithoutMood,
      },
      unit: factor.unit,
    };
  }

  let direction: PawTrendsActivityAssociation["direction"] = "zero";
  if (pearsonR > 0) {
    direction = "positive";
  } else if (pearsonR < 0) {
    direction = "negative";
  }

  return {
    comparison,
    direction,
    factor: factor.label,
    factorKind: factor.factorKind,
    level: "activity",
    mood,
    pearsonR,
    samples,
    stableKey: `${factor.key}:mood:${mood.toLocaleLowerCase("en-US")}`,
    strength: Math.abs(pearsonR),
    timeRelationship:
      factor.activityKind === "walk"
        ? "On the same Walk"
        : "On the same Training",
  };
};

/** Sorts eligible Associations by strength, sample size, and stable key, then keeps ten. */
export function rankPawTrendsAssociationCandidates<
  Association extends {
    samples: readonly unknown[];
    stableKey: string;
    strength: number;
  },
>(associations: readonly Association[]): Association[] {
  return associations
    .toSorted(
      (left, right) =>
        right.strength - left.strength ||
        right.samples.length - left.samples.length ||
        left.stableKey.localeCompare(right.stableKey, "en-US")
    )
    .slice(0, PAW_TRENDS_MAXIMUM_ASSOCIATIONS);
}

/** Returns every eligible activity-level Association before the global top-ten ranking. */
export function calculatePawTrendsActivityAssociationCandidates(
  activities: readonly PawTrendsPlainActivity[]
): PawTrendsActivityAssociation[] {
  const factors = createPawTrendsActivityFactors(activities);
  return factors.flatMap((factor) =>
    PAW_TRENDS_DOG_MOODS.flatMap((mood) => {
      const association = createPawTrendsAssociation(activities, factor, mood);
      return association === undefined ? [] : [association];
    })
  );
}

/** Returns the ten strongest eligible activity-level Associations from plain activity records. */
export function calculatePawTrendsActivityAssociations(
  activities: readonly PawTrendsPlainActivity[]
): PawTrendsActivityAssociation[] {
  return rankPawTrendsAssociationCandidates(
    calculatePawTrendsActivityAssociationCandidates(activities)
  );
}
