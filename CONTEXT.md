# Paw Trends

Paw Trends records one owner's observations about one dog's walks and both of their daily states. It helps the owner inspect possible associations in the observations without claiming diagnosis or causation.

## Language

**Owner**: The person who records observations about herself and her dog. _Avoid_: User, account, handler

**Dog**: The dog whose walks, mood, and reactions the Owner records. _Avoid_: Pet, animal

**Walk**: A Dog Activity during which the Owner may record Trigger Encounters. Walks also record duration, Place, Company, and Dog Symptoms.

**Place**: The Owner's single reusable label for the routine area that best characterizes a Walk, such as Home route or Lake11. Paw Trends treats different labels as different categories and assigns them no geographic meaning. _Avoid_: Route, location

**Company**: A person or animal intentionally accompanying the Owner and Dog for part or all of a Walk. A subject merely encountered during the Walk is a Trigger, not Company. _Avoid_: Trigger, encounter

**Training**: A Dog Activity recorded as either mantrailing or physio in the first version. A Training records its Activity Mood and any Dog Symptoms, but does not contain Trigger Encounters or other Walk details.

**Dog Activity**: A recorded Walk or Training session involving the Dog. _Avoid_: Event, session

**Trigger**: A kind of subject or situation encountered during a Walk, such as a cat or dog, that may provoke a reaction from the Dog. _Avoid_: Reaction, incident

**Trigger Encounter**: One observed occurrence of a Trigger during a Walk, including occurrences in which the Dog does not react. _Avoid_: Trigger, reaction

**Reaction Severity**: The Owner's rating of the Dog's response to a Trigger Encounter: 0 means noticed with no reaction, 1 means mild attention with easy disengagement, 2 means sustained attention while still responding to guidance, 3 means a mild reaction, 4 means an intense reaction without ready disengagement, and 5 means an extreme reaction or immediate safety concern. _Avoid_: Trigger severity

**Mood Interval**: A reported overall Dog or Owner mood that begins at its recorded time and remains valid until another mood is recorded for the same subject or the local calendar day ends, whichever happens first. Unrecorded time is unknown, and a mood never carries into the next day. _Avoid_: Continuous mood, state timeline

**Activity Mood**: A single required Dog Mood describing the dominant mood across a Dog Activity. It is recorded independently of the Dog's day-level Mood Intervals. _Avoid_: Walk mood, training mood, start mood, end mood

**Dog Mood**: One dominant state selected from the fixed labels Playful, Sleepy, Grumpy, Hate-the-world, Overwhelmed, Tense, or Aggressive. The same vocabulary describes a Dog Mood Interval and an Activity Mood.

**Aggressive**: The Owner's personal Dog Mood for periods when the Dog preemptively attacks every perceived Trigger from an unusually early point, before an encounter would normally provoke a reaction. _Avoid_: A single severe Trigger Encounter

**Owner Mood**: One dominant state selected from the fixed labels Good, Relaxed, Anxious, Moody, Sad, or Stressed.

**Dog Symptom**: A reusable label for a physical sign observed in the Dog, such as limping or robot-like movement. Zero or more Dog Symptoms may be selected on a Walk or Training without recording severity or per-symptom notes; an empty list explicitly means none were noticed. _Avoid_: Dog note, behavior, diagnosis

**Daily Mood Presence**: Whether a particular Dog Mood appeared in any recorded Mood Interval during a local calendar day. Training Associations compare presence by day rather than the duration of a mood.

**Observed Day**: A local calendar day containing at least one Dog Mood Interval. Each Observed Day is one sample when comparing Daily Mood Presence with Factors.

**Factor Window**: An Observed Day together with the six preceding local calendar days. Logged Factors within this seven-day period are summarized for comparison with Daily Mood Presence on the Observed Day.

**Owner Symptom**: A health symptom the Owner reports as present on a local calendar day. It is an observation, not a diagnosis, and has no severity in the first version. _Avoid_: Diagnosis, condition

**Daily Check-in**: The Owner's explicit confirmation of which Owner Symptoms were present on a local calendar day, including confirmation that none were present. A day without a completed Daily Check-in is unknown rather than symptom-free.

**Factor**: Any logged domain observation other than Dog Mood that can be compared with Dog Mood. A Factor is a candidate context for an Association, not a claimed cause. _Avoid_: Cause, predictor

**Association**: A descriptive comparison between a Factor and Dog Mood calculated from recorded data. It never states or implies that the Factor caused the Dog Mood. _Avoid_: Effect, finding, diagnosis, conclusion
