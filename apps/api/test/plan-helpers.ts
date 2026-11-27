import { randomUUID } from 'node:crypto';
import type { PlanContent } from '@noexcuse/contracts';

// A plan with one block and one workout; the workout key is the stable handle a calendar entry holds.
export function planWith(workoutKey: string, title: string): PlanContent {
  return {
    blocks: [
      {
        key: randomUUID(),
        title: 'Strength',
        workouts: [
          {
            key: workoutKey,
            title,
            exercises: [
              { key: randomUUID(), name: 'Squat', sets: 3, repsMin: 5, repsMax: 5, weightKg: null, restSec: null, note: null },
            ],
          },
        ],
      },
    ],
  };
}
