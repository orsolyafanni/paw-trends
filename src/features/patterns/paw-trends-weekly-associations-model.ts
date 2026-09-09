import {
  PAW_TRENDS_DOG_MOODS,
  PAW_TRENDS_OWNER_MOODS,
} from "@/domain/paw-trends-moods";
import type {
  PawTrendsDogMood,
  PawTrendsOwnerMood,
} from "@/domain/paw-trends-moods";

import {
  calculatePawTrendsActivityAssociationCandidates,
  calculatePawTrendsPearsonCorrelation,
  PAW_TRENDS_MINIMUM_ASSOCIATION_SIDE_SAMPLES,
  rankPawTrendsAssociationCandidates,
} from "./paw-trends-activity-associations-model";
import type {
  PawTrendsActivityAssociation,
  PawTrendsAssociationComparisonSide,
  PawTrendsPlainActivity,
  PawTrendsPlainTraining,
  PawTrendsPlainWalk,
} from "./paw-trends-activity-associations-model";

export interface PawTrendsPlainMoodEntry {
  id: string;
  localDate: string;
  mood: PawTrendsDogMood | PawTrendsOwnerMood;
  recordedAt: string;
  subject: "dog" | "owner";
}

export interface PawTrendsPlainDailyCheckIn {
  localDate: string;
  ownerSymptoms: readonly string[];
}

export interface PawTrendsFactorWindowSummary {
  activityTypeCounts: { Training: number; Walk: number };
  averageReactionSeverity: number;
  companyActivityCounts: Readonly<Record<string, number>>;
  dogSymptomActivityCounts: Readonly<Record<string, number>>;
  ownerMoodDayCounts: Partial<Record<PawTrendsOwnerMood, number>>;
  ownerSymptomDayCounts: Readonly<Record<string, number>>;
  peakReactionSeverity: number;
  placeActivityCounts: Readonly<Record<string, number>>;
  reactiveEncounterCount: number;
  totalEncounterCount: number;
  trainingTypeActivityCounts: Readonly<Record<string, number>>;
  triggerEncounterCounts: Readonly<Record<string, number>>;
  walkDurationMinutes: number;
}

export interface PawTrendsTrainingRecencySample {
  daysSinceTraining: number;
  localDate: string;
}

export interface PawTrendsDayAssociationSample {
  factorValue: number;
  localDate: string;
  moodPresent: boolean;
  sampleKind: "day";
}

export interface PawTrendsDayAssociation {
  comparison: {
    difference: number;
    format: "average";
    left: PawTrendsAssociationComparisonSide;
    right: PawTrendsAssociationComparisonSide;
    unit: string;
  };
  direction: "negative" | "positive" | "zero";
  factor: string;
  factorKind: "numeric";
  level: "day";
  mood: PawTrendsDogMood;
  pearsonR: number;
  samples: PawTrendsDayAssociationSample[];
  stableKey: string;
  strength: number;
  timeRelationship: "Across the 7-day Factor Window" | "Training recency";
}

export type PawTrendsAssociation =
  | PawTrendsActivityAssociation
  | PawTrendsDayAssociation;

export interface PawTrendsAssociationRecords {
  activities: readonly PawTrendsPlainActivity[];
  checkIns: readonly PawTrendsPlainDailyCheckIn[];
  moodEntries: readonly PawTrendsPlainMoodEntry[];
}

interface PawTrendsDayFactor {
  key: string;
  label: string;
  readValue: (observedDate: string) => number | undefined;
  timeRelationship: PawTrendsDayAssociation["timeRelationship"];
  unit: string;
}

const PAW_TRENDS_FACTOR_WINDOW_DAYS = 7;
const PAW_TRENDS_MILLISECONDS_PER_DAY = 86_400_000;

const meanPawTrendsDayValues = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const normalizePawTrendsDayFactorLabel = (value: string): string =>
  value.trim().toLocaleLowerCase("en-US");

const listPawTrendsDayFactorLabels = (
  values: readonly string[]
): readonly string[] =>
  [
    ...new Map(
      values.map((value) => [
        normalizePawTrendsDayFactorLabel(value),
        value.trim(),
      ])
    ).values(),
  ].toSorted((left, right) => left.localeCompare(right, "en-US"));

const incrementPawTrendsLabelCount = (
  counts: Record<string, number>,
  label: string
) => {
  const normalizedLabel = normalizePawTrendsDayFactorLabel(label);
  counts[normalizedLabel] = (counts[normalizedLabel] ?? 0) + 1;
};

const readPawTrendsLabelCount = (
  counts: Readonly<Record<string, number>>,
  label: string
): number => counts[normalizePawTrendsDayFactorLabel(label)] ?? 0;

/** Returns exact local calendar-day distance without daylight-saving drift. */
export function differencePawTrendsLocalCalendarDays(
  laterLocalDate: string,
  earlierLocalDate: string
): number {
  const [laterYear, laterMonth, laterDay] = laterLocalDate
    .split("-")
    .map(Number);
  const [earlierYear, earlierMonth, earlierDay] = earlierLocalDate
    .split("-")
    .map(Number);
  return (
    (Date.UTC(laterYear, laterMonth - 1, laterDay) -
      Date.UTC(earlierYear, earlierMonth - 1, earlierDay)) /
    PAW_TRENDS_MILLISECONDS_PER_DAY
  );
}

const isPawTrendsDateInFactorWindow = (
  localDate: string,
  observedDate: string
): boolean => {
  const daysBeforeObservedDay = differencePawTrendsLocalCalendarDays(
    observedDate,
    localDate
  );
  return (
    daysBeforeObservedDay >= 0 &&
    daysBeforeObservedDay < PAW_TRENDS_FACTOR_WINDOW_DAYS
  );
};

const isPawTrendsOwnerMood = (mood: string): mood is PawTrendsOwnerMood =>
  PAW_TRENDS_OWNER_MOODS.some((candidate) => candidate === mood);

const isPawTrendsDayOutcomeMood = (mood: string): mood is PawTrendsDogMood =>
  PAW_TRENDS_DOG_MOODS.some((candidate) => candidate === mood);

/** Summarizes raw Factors on an Observed Day and its six preceding local dates. */
export function summarizePawTrendsFactorWindow(
  observedDate: string,
  records: PawTrendsAssociationRecords
): PawTrendsFactorWindowSummary {
  const windowActivities = records.activities.filter((activity) =>
    isPawTrendsDateInFactorWindow(activity.localDate, observedDate)
  );
  const walks = windowActivities.filter(
    (activity): activity is PawTrendsPlainWalk => activity.kind === "walk"
  );
  const trainings = windowActivities.filter(
    (activity): activity is PawTrendsPlainTraining =>
      activity.kind === "training"
  );
  const placeActivityCounts: Record<string, number> = {};
  const companyActivityCounts: Record<string, number> = {};
  const dogSymptomActivityCounts: Record<string, number> = {};
  const trainingTypeActivityCounts: Record<string, number> = {};
  const triggerEncounterCounts: Record<string, number> = {};

  for (const walk of walks) {
    incrementPawTrendsLabelCount(placeActivityCounts, walk.place);
    for (const company of walk.company) {
      incrementPawTrendsLabelCount(companyActivityCounts, company);
    }
    for (const symptom of walk.dogSymptoms) {
      incrementPawTrendsLabelCount(dogSymptomActivityCounts, symptom);
    }
    for (const encounter of walk.triggerEncounters) {
      incrementPawTrendsLabelCount(triggerEncounterCounts, encounter.trigger);
    }
  }
  for (const training of trainings) {
    incrementPawTrendsLabelCount(
      trainingTypeActivityCounts,
      training.trainingType
    );
    for (const symptom of training.dogSymptoms) {
      incrementPawTrendsLabelCount(dogSymptomActivityCounts, symptom);
    }
  }

  const ownerMoodDates = new Map<PawTrendsOwnerMood, Set<string>>();
  for (const entry of records.moodEntries) {
    if (
      entry.subject !== "owner" ||
      !isPawTrendsOwnerMood(entry.mood) ||
      !isPawTrendsDateInFactorWindow(entry.localDate, observedDate)
    ) {
      continue;
    }
    const dates = ownerMoodDates.get(entry.mood) ?? new Set<string>();
    dates.add(entry.localDate);
    ownerMoodDates.set(entry.mood, dates);
  }
  const ownerMoodDayCounts: Partial<Record<PawTrendsOwnerMood, number>> = {};
  for (const [mood, dates] of ownerMoodDates) {
    ownerMoodDayCounts[mood] = dates.size;
  }

  const ownerSymptomDates = new Map<string, Set<string>>();
  for (const checkIn of records.checkIns) {
    if (!isPawTrendsDateInFactorWindow(checkIn.localDate, observedDate)) {
      continue;
    }
    for (const symptom of checkIn.ownerSymptoms) {
      const normalizedSymptom = normalizePawTrendsDayFactorLabel(symptom);
      const dates = ownerSymptomDates.get(normalizedSymptom) ?? new Set();
      dates.add(checkIn.localDate);
      ownerSymptomDates.set(normalizedSymptom, dates);
    }
  }
  const ownerSymptomDayCounts: Record<string, number> = {};
  for (const [symptom, dates] of ownerSymptomDates) {
    ownerSymptomDayCounts[symptom] = dates.size;
  }

  const encounters = walks.flatMap((walk) => walk.triggerEncounters);
  return {
    activityTypeCounts: {
      Training: trainings.length,
      Walk: walks.length,
    },
    averageReactionSeverity:
      encounters.length === 0
        ? 0
        : meanPawTrendsDayValues(
            encounters.map((encounter) => encounter.reactionSeverity)
          ),
    companyActivityCounts,
    dogSymptomActivityCounts,
    ownerMoodDayCounts,
    ownerSymptomDayCounts,
    peakReactionSeverity: Math.max(
      0,
      ...encounters.map((encounter) => encounter.reactionSeverity)
    ),
    placeActivityCounts,
    reactiveEncounterCount: encounters.filter(
      (encounter) => encounter.reactionSeverity >= 3
    ).length,
    totalEncounterCount: encounters.length,
    trainingTypeActivityCounts,
    triggerEncounterCounts,
    walkDurationMinutes: walks.reduce(
      (total, walk) => total + walk.durationMinutes,
      0
    ),
  };
}

/** Lists exact days since a Training Type, excluding Observed Days before its first occurrence. */
export function listPawTrendsTrainingRecencySamples(
  observedDates: readonly string[],
  activities: readonly PawTrendsPlainActivity[],
  trainingType: string
): PawTrendsTrainingRecencySample[] {
  const trainingDates = activities
    .filter(
      (activity): activity is PawTrendsPlainTraining =>
        activity.kind === "training" &&
        normalizePawTrendsDayFactorLabel(activity.trainingType) ===
          normalizePawTrendsDayFactorLabel(trainingType)
    )
    .map((training) => training.localDate)
    .toSorted();

  return observedDates.toSorted().flatMap((localDate) => {
    const latestTrainingDate = trainingDates.findLast(
      (trainingDate) => trainingDate <= localDate
    );
    return latestTrainingDate === undefined
      ? []
      : [
          {
            daysSinceTraining: differencePawTrendsLocalCalendarDays(
              localDate,
              latestTrainingDate
            ),
            localDate,
          },
        ];
  });
}

const createPawTrendsFactorWindowReader =
  (
    summaries: ReadonlyMap<string, PawTrendsFactorWindowSummary>,
    readSummary: (summary: PawTrendsFactorWindowSummary) => number
  ) =>
  (observedDate: string): number => {
    const summary = summaries.get(observedDate);
    return summary === undefined ? 0 : readSummary(summary);
  };

const createPawTrendsDayFactors = (
  records: PawTrendsAssociationRecords,
  observedDates: readonly string[]
): PawTrendsDayFactor[] => {
  const summaries = new Map(
    observedDates.map((date) => [
      date,
      summarizePawTrendsFactorWindow(date, records),
    ])
  );
  const factorWindow = (
    key: string,
    label: string,
    unit: string,
    readSummary: (summary: PawTrendsFactorWindowSummary) => number
  ): PawTrendsDayFactor => ({
    key: `day:window:${key}`,
    label,
    readValue: createPawTrendsFactorWindowReader(summaries, readSummary),
    timeRelationship: "Across the 7-day Factor Window",
    unit,
  });
  const factors: PawTrendsDayFactor[] = [
    factorWindow(
      "activity-type:walk",
      "Dog Activity Type = Walk",
      "activities",
      (summary) => summary.activityTypeCounts.Walk
    ),
    factorWindow(
      "activity-type:training",
      "Dog Activity Type = Training",
      "activities",
      (summary) => summary.activityTypeCounts.Training
    ),
    factorWindow(
      "walk-duration-minutes",
      "Walk duration",
      "minutes",
      (summary) => summary.walkDurationMinutes
    ),
    factorWindow(
      "total-trigger-encounters",
      "Total Trigger Encounters",
      "encounters",
      (summary) => summary.totalEncounterCount
    ),
    factorWindow(
      "reactive-encounters",
      "Reactive Encounters",
      "encounters",
      (summary) => summary.reactiveEncounterCount
    ),
    factorWindow(
      "average-reaction-severity",
      "Average Reaction Severity",
      "severity points",
      (summary) => summary.averageReactionSeverity
    ),
    factorWindow(
      "peak-reaction-severity",
      "Peak Reaction Severity",
      "severity points",
      (summary) => summary.peakReactionSeverity
    ),
  ];

  const walks = records.activities.filter(
    (activity): activity is PawTrendsPlainWalk => activity.kind === "walk"
  );
  const trainings = records.activities.filter(
    (activity): activity is PawTrendsPlainTraining =>
      activity.kind === "training"
  );
  const labelFactors = [
    {
      category: "Place",
      labels: listPawTrendsDayFactorLabels(walks.map((walk) => walk.place)),
      readCount: (summary: PawTrendsFactorWindowSummary, label: string) =>
        readPawTrendsLabelCount(summary.placeActivityCounts, label),
      unit: "activities",
    },
    {
      category: "Company",
      labels: listPawTrendsDayFactorLabels(
        walks.flatMap((walk) => walk.company)
      ),
      readCount: (summary: PawTrendsFactorWindowSummary, label: string) =>
        readPawTrendsLabelCount(summary.companyActivityCounts, label),
      unit: "activities",
    },
    {
      category: "Training Type",
      labels: listPawTrendsDayFactorLabels(
        trainings.map((training) => training.trainingType)
      ),
      readCount: (summary: PawTrendsFactorWindowSummary, label: string) =>
        readPawTrendsLabelCount(summary.trainingTypeActivityCounts, label),
      unit: "activities",
    },
    {
      category: "Dog Symptom",
      labels: listPawTrendsDayFactorLabels(
        records.activities.flatMap((activity) => activity.dogSymptoms)
      ),
      readCount: (summary: PawTrendsFactorWindowSummary, label: string) =>
        readPawTrendsLabelCount(summary.dogSymptomActivityCounts, label),
      unit: "activities",
    },
    {
      category: "Trigger",
      labels: listPawTrendsDayFactorLabels(
        walks.flatMap((walk) =>
          walk.triggerEncounters.map((encounter) => encounter.trigger)
        )
      ),
      readCount: (summary: PawTrendsFactorWindowSummary, label: string) =>
        readPawTrendsLabelCount(summary.triggerEncounterCounts, label),
      unit: "encounters",
    },
    {
      category: "Owner Mood",
      labels: PAW_TRENDS_OWNER_MOODS,
      readCount: (summary: PawTrendsFactorWindowSummary, label: string) =>
        isPawTrendsOwnerMood(label)
          ? (summary.ownerMoodDayCounts[label] ?? 0)
          : 0,
      unit: "days",
    },
    {
      category: "Owner Symptom",
      labels: listPawTrendsDayFactorLabels(
        records.checkIns.flatMap((checkIn) => checkIn.ownerSymptoms)
      ),
      readCount: (summary: PawTrendsFactorWindowSummary, label: string) =>
        readPawTrendsLabelCount(summary.ownerSymptomDayCounts, label),
      unit: "days",
    },
  ] as const;

  for (const labelFactor of labelFactors) {
    for (const label of labelFactor.labels) {
      factors.push(
        factorWindow(
          `${normalizePawTrendsDayFactorLabel(labelFactor.category)}:${normalizePawTrendsDayFactorLabel(label)}`,
          `${labelFactor.category} = ${label}`,
          labelFactor.unit,
          (summary) => labelFactor.readCount(summary, label)
        )
      );
    }
  }

  for (const trainingType of listPawTrendsDayFactorLabels(
    trainings.map((training) => training.trainingType)
  )) {
    const recencyByDate = new Map(
      listPawTrendsTrainingRecencySamples(
        observedDates,
        records.activities,
        trainingType
      ).map((sample) => [sample.localDate, sample.daysSinceTraining])
    );
    factors.push({
      key: `day:training-recency:${normalizePawTrendsDayFactorLabel(trainingType)}`,
      label: `Days since ${trainingType} Training`,
      readValue: (observedDate) => recencyByDate.get(observedDate),
      timeRelationship: "Training recency",
      unit: "days",
    });
  }

  return factors;
};

const createPawTrendsDayAssociation = (
  observedMoods: ReadonlyMap<string, ReadonlySet<PawTrendsDogMood>>,
  factor: PawTrendsDayFactor,
  mood: PawTrendsDogMood
): PawTrendsDayAssociation | undefined => {
  const samples = [...observedMoods.keys()].toSorted().flatMap((localDate) => {
    const factorValue = factor.readValue(localDate);
    return factorValue === undefined
      ? []
      : [
          {
            factorValue,
            localDate,
            moodPresent: observedMoods.get(localDate)?.has(mood) ?? false,
            sampleKind: "day" as const,
          },
        ];
  });
  const moodSampleSize = samples.filter((sample) => sample.moodPresent).length;
  const withoutMoodSampleSize = samples.length - moodSampleSize;
  if (
    samples.length < PAW_TRENDS_MINIMUM_ASSOCIATION_SIDE_SAMPLES * 2 ||
    moodSampleSize < PAW_TRENDS_MINIMUM_ASSOCIATION_SIDE_SAMPLES ||
    withoutMoodSampleSize < PAW_TRENDS_MINIMUM_ASSOCIATION_SIDE_SAMPLES
  ) {
    return undefined;
  }

  const factorValues = samples.map((sample) => sample.factorValue);
  const outcomeValues = samples.map((sample) => (sample.moodPresent ? 1 : 0));
  const pearsonR = calculatePawTrendsPearsonCorrelation(
    factorValues,
    outcomeValues
  );
  if (pearsonR === undefined) {
    return undefined;
  }
  const valuesWithMood = samples
    .filter((sample) => sample.moodPresent)
    .map((sample) => sample.factorValue);
  const valuesWithoutMood = samples
    .filter((sample) => !sample.moodPresent)
    .map((sample) => sample.factorValue);
  const averageWithMood = meanPawTrendsDayValues(valuesWithMood);
  const averageWithoutMood = meanPawTrendsDayValues(valuesWithoutMood);
  let direction: PawTrendsDayAssociation["direction"] = "zero";
  if (pearsonR > 0) {
    direction = "positive";
  } else if (pearsonR < 0) {
    direction = "negative";
  }

  return {
    comparison: {
      difference: averageWithMood - averageWithoutMood,
      format: "average",
      left: {
        label: `${mood} days`,
        sampleSize: valuesWithMood.length,
        value: averageWithMood,
      },
      right: {
        label: "Other days",
        sampleSize: valuesWithoutMood.length,
        value: averageWithoutMood,
      },
      unit: factor.unit,
    },
    direction,
    factor: factor.label,
    factorKind: "numeric",
    level: "day",
    mood,
    pearsonR,
    samples,
    stableKey: `${factor.key}:mood:${mood.toLocaleLowerCase("en-US")}`,
    strength: Math.abs(pearsonR),
    timeRelationship: factor.timeRelationship,
  };
};

const listPawTrendsObservedDayMoods = (
  moodEntries: readonly PawTrendsPlainMoodEntry[]
): ReadonlyMap<string, ReadonlySet<PawTrendsDogMood>> => {
  const observedMoods = new Map<string, Set<PawTrendsDogMood>>();
  for (const entry of moodEntries) {
    if (entry.subject !== "dog" || !isPawTrendsDayOutcomeMood(entry.mood)) {
      continue;
    }
    const moods = observedMoods.get(entry.localDate) ?? new Set();
    moods.add(entry.mood);
    observedMoods.set(entry.localDate, moods);
  }
  return observedMoods;
};

/** Returns every eligible seven-day and Training-recency Association before ranking. */
export function calculatePawTrendsDayAssociationCandidates(
  records: PawTrendsAssociationRecords
): PawTrendsDayAssociation[] {
  const observedMoods = listPawTrendsObservedDayMoods(records.moodEntries);
  const factors = createPawTrendsDayFactors(records, [...observedMoods.keys()]);
  return factors.flatMap((factor) =>
    PAW_TRENDS_DOG_MOODS.flatMap((mood) => {
      const association = createPawTrendsDayAssociation(
        observedMoods,
        factor,
        mood
      );
      return association === undefined ? [] : [association];
    })
  );
}

/** Ranks activity and day Associations together and returns the strongest ten. */
export function calculatePawTrendsAssociations(
  records: PawTrendsAssociationRecords
): PawTrendsAssociation[] {
  return rankPawTrendsAssociationCandidates([
    ...calculatePawTrendsActivityAssociationCandidates(records.activities),
    ...calculatePawTrendsDayAssociationCandidates(records),
  ]);
}
