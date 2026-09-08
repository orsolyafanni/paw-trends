export const PAW_TRENDS_DOG_MOODS = [
  "Playful",
  "Sleepy",
  "Grumpy",
  "Hate-the-world",
  "Overwhelmed",
  "Tense",
  "Aggressive",
] as const;

export const PAW_TRENDS_OWNER_MOODS = [
  "Good",
  "Relaxed",
  "Anxious",
  "Moody",
  "Sad",
  "Stressed",
] as const;

export type PawTrendsDogMood = (typeof PAW_TRENDS_DOG_MOODS)[number];
export type PawTrendsOwnerMood = (typeof PAW_TRENDS_OWNER_MOODS)[number];
