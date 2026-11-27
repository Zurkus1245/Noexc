import type { PlanContent } from '@noexcuse/contracts';
import { describe, expect, it } from 'vitest';
import { findWorkout, missingScheduledKeys, workoutKeys } from './plan';

const uuid = (n: number) => `123e4567-e89b-42d3-a456-${String(n).padStart(12, '0')}`;

const exercise = (n: number) => ({
  key: uuid(n),
  name: 'Squat',
  sets: 3,
  repsMin: 5,
  repsMax: 8,
  weightKg: null,
  restSec: null,
  note: null,
});

const DAY_A = { key: uuid(10), title: 'Day A', exercises: [exercise(100)] };
const DAY_B = { key: uuid(11), title: 'Day B', exercises: [exercise(101)] };
const DAY_C = { key: uuid(12), title: 'Day C', exercises: [exercise(102)] };
const BASE_BLOCK = { key: uuid(1), title: 'Base', workouts: [DAY_A, DAY_B] };
const PEAK_BLOCK = { key: uuid(2), title: 'Peak', workouts: [DAY_C] };

const PLAN: PlanContent = {
  blocks: [BASE_BLOCK, PEAK_BLOCK, { key: uuid(3), title: 'Deload', workouts: [] }],
};

describe('workoutKeys', () => {
  it('collects the workout keys across all blocks', () => {
    expect(workoutKeys(PLAN)).toEqual(new Set([uuid(10), uuid(11), uuid(12)]));
  });

  it('excludes block and exercise keys', () => {
    const keys = workoutKeys(PLAN);
    expect(keys.has(uuid(1))).toBe(false);
    expect(keys.has(uuid(100))).toBe(false);
  });

  it('is empty for an empty plan', () => {
    expect(workoutKeys({ blocks: [] })).toEqual(new Set());
  });
});

describe('findWorkout', () => {
  it('returns the workout with its block title', () => {
    expect(findWorkout(PLAN, uuid(12))).toEqual({ workout: DAY_C, blockTitle: 'Peak' });
  });

  it('returns null for a key that is not in the plan', () => {
    expect(findWorkout(PLAN, uuid(99))).toBeNull();
  });

  it('returns null for a block key, since only workouts are addressable', () => {
    expect(findWorkout(PLAN, uuid(1))).toBeNull();
  });

  it('reflects the edited content of the current version', () => {
    const renamed = { ...DAY_A, title: 'New' };
    const edited: PlanContent = { blocks: [{ ...BASE_BLOCK, title: 'Renamed', workouts: [renamed] }] };
    expect(findWorkout(edited, uuid(10))).toEqual({ workout: renamed, blockTitle: 'Renamed' });
  });
});

describe('missingScheduledKeys', () => {
  it('returns nothing when every scheduled key is still in the new version', () => {
    expect(missingScheduledKeys(PLAN, [uuid(10), uuid(12)])).toEqual([]);
  });

  it('returns the scheduled keys the new version dropped', () => {
    const withoutB: PlanContent = { blocks: [{ ...BASE_BLOCK, workouts: [DAY_A] }] };
    expect(missingScheduledKeys(withoutB, [uuid(10), uuid(11), uuid(12)])).toEqual([uuid(11), uuid(12)]);
  });

  it('lists a dropped key once even when several entries reference it', () => {
    expect(missingScheduledKeys({ blocks: [] }, [uuid(11), uuid(11), uuid(10)])).toEqual([uuid(11), uuid(10)]);
  });

  it('returns nothing when no entries are scheduled', () => {
    expect(missingScheduledKeys({ blocks: [] }, [])).toEqual([]);
  });
});
