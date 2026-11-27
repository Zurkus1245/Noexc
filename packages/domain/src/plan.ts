import type { PlanContent, Workout } from '@noexcuse/contracts';

export type WorkoutLocation = { workout: Workout; blockTitle: string };

export function workoutKeys(content: PlanContent): Set<string> {
  const keys = new Set<string>();
  for (const block of content.blocks) {
    for (const workout of block.workouts) keys.add(workout.key);
  }
  return keys;
}

// Calendar entries resolve through this lookup, so an edited workout shows its current content.
export function findWorkout(content: PlanContent, key: string): WorkoutLocation | null {
  for (const block of content.blocks) {
    const workout = block.workouts.find((candidate) => candidate.key === key);
    if (workout !== undefined) return { workout, blockTitle: block.title };
  }
  return null;
}

// Keys the new version drops while a calendar entry still references them; returned once each, in first-seen order.
export function missingScheduledKeys(newContent: PlanContent, scheduledKeys: readonly string[]): string[] {
  const present = workoutKeys(newContent);
  return [...new Set(scheduledKeys)].filter((key) => !present.has(key));
}
