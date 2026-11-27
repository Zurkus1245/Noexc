import { describe, expect, it } from 'vitest';
import {
  ClientPlansResponseSchema,
  PLAN_LIMITS,
  PlanContentSchema,
  PlanSchema,
  PlanVersionsPageSchema,
  PutPlanRequestSchema,
} from './plan';

const uuid = (n: number) => `123e4567-e89b-42d3-a456-${String(n).padStart(12, '0')}`;
const NOW = '2026-11-01T10:00:00.000Z';

const exercise = (n: number, overrides: Record<string, unknown> = {}) => ({
  key: uuid(n),
  name: 'Squat',
  sets: 3,
  repsMin: 5,
  repsMax: 8,
  weightKg: 62.5,
  restSec: 90,
  note: null,
  ...overrides,
});

const workout = (n: number, exercises = [exercise(n + 100)]) => ({ key: uuid(n), title: 'Day A', exercises });

const content = (blocks: unknown[] = [{ key: uuid(1), title: 'Base', workouts: [workout(2)] }]) => ({ blocks });

const withExercise = (overrides: Record<string, unknown>) =>
  content([{ key: uuid(1), title: 'Base', workouts: [workout(2, [exercise(3, overrides)])] }]);

const expectRejected = (value: unknown) => expect(PlanContentSchema.safeParse(value).success).toBe(false);

describe('PlanContentSchema', () => {
  it('accepts a full valid plan', () => {
    expect(PlanContentSchema.parse(content()).blocks).toHaveLength(1);
  });

  it('accepts an empty plan', () => {
    expect(PlanContentSchema.parse({ blocks: [] })).toEqual({ blocks: [] });
  });

  it('accepts a block with no workouts', () => {
    expect(PlanContentSchema.safeParse(content([{ key: uuid(1), title: 'Rest', workouts: [] }])).success).toBe(true);
  });

  it('trims names and titles', () => {
    const parsed = PlanContentSchema.parse(
      content([{ key: uuid(1), title: '  Base  ', workouts: [{ ...workout(2), title: ' Day ' }] }]),
    );
    expect(parsed.blocks[0]?.title).toBe('Base');
    expect(parsed.blocks[0]?.workouts[0]?.title).toBe('Day');
  });

  it('rejects a duplicate key between a block and a workout', () => {
    expectRejected(content([{ key: uuid(1), title: 'Base', workouts: [workout(1)] }]));
  });

  it('rejects a duplicate key between exercises in different workouts', () => {
    const first = workout(2, [exercise(50)]);
    const second = workout(3, [exercise(50)]);
    expectRejected(content([{ key: uuid(1), title: 'Base', workouts: [first, second] }]));
  });

  it('rejects a duplicate key across blocks', () => {
    expectRejected(
      content([
        { key: uuid(1), title: 'A', workouts: [] },
        { key: uuid(1), title: 'B', workouts: [] },
      ]),
    );
  });

  it('rejects an exercise key equal to its workout key', () => {
    expectRejected(content([{ key: uuid(1), title: 'Base', workouts: [workout(2, [exercise(2)])] }]));
  });

  it('accepts repsMax equal to repsMin', () => {
    expect(withExercise({ repsMin: 6, repsMax: 6 }).blocks).toHaveLength(1);
    expect(PlanContentSchema.safeParse(withExercise({ repsMin: 6, repsMax: 6 })).success).toBe(true);
  });

  it('rejects repsMax below repsMin', () => {
    expectRejected(withExercise({ repsMin: 9, repsMax: 8 }));
  });

  it('rejects a workout with no exercises', () => {
    expectRejected(content([{ key: uuid(1), title: 'Base', workouts: [workout(2, [])] }]));
  });

  it('rejects more than the maximum exercises per workout', () => {
    const exercises = Array.from({ length: PLAN_LIMITS.exercisesPerWorkoutMax + 1 }, (_, i) => exercise(i + 100));
    expectRejected(content([{ key: uuid(1), title: 'Base', workouts: [workout(2, exercises)] }]));
  });

  it('rejects more than the maximum workouts per block', () => {
    const workouts = Array.from({ length: PLAN_LIMITS.workoutsPerBlockMax + 1 }, (_, i) => workout(i + 100));
    expectRejected(content([{ key: uuid(1), title: 'Base', workouts }]));
  });

  it('rejects more than the maximum blocks', () => {
    const blocks = Array.from({ length: PLAN_LIMITS.blocksMax + 1 }, (_, i) => ({
      key: uuid(i + 1000),
      title: 'B',
      workouts: [],
    }));
    expectRejected(content(blocks));
  });

  it.each([
    ['sets below minimum', { sets: 0 }],
    ['sets above maximum', { sets: PLAN_LIMITS.setsMax + 1 }],
    ['sets not an integer', { sets: 2.5 }],
    ['reps above maximum', { repsMin: 1, repsMax: PLAN_LIMITS.repsMax + 1 }],
    ['reps below minimum', { repsMin: 0, repsMax: 5 }],
    ['negative weight', { weightKg: -0.25 }],
    ['weight above maximum', { weightKg: PLAN_LIMITS.weightKgMax + 0.25 }],
    ['weight off the 0.25 step', { weightKg: 62.1 }],
    ['rest above maximum', { restSec: PLAN_LIMITS.restSecMax + 1 }],
    ['negative rest', { restSec: -1 }],
    ['note above maximum', { note: 'x'.repeat(PLAN_LIMITS.noteMax + 1) }],
    ['blank name', { name: '   ' }],
    ['name above maximum', { name: 'x'.repeat(PLAN_LIMITS.titleMax + 1) }],
    ['malformed key', { key: 'not-a-uuid' }],
  ])('rejects an exercise with %s', (_label, overrides) => {
    expectRejected(withExercise(overrides));
  });

  it.each([
    ['null weight', { weightKg: null }],
    ['maximum weight', { weightKg: PLAN_LIMITS.weightKgMax }],
    ['zero weight', { weightKg: 0 }],
    ['quarter-kilo weight', { weightKg: 62.25 }],
    ['null rest', { restSec: null }],
    ['maximum note', { note: 'x'.repeat(PLAN_LIMITS.noteMax) }],
    ['null note', { note: null }],
  ])('accepts an exercise with %s', (_label, overrides) => {
    expect(PlanContentSchema.safeParse(withExercise(overrides)).success).toBe(true);
  });
});

describe('PlanSchema', () => {
  const plan = { linkId: uuid(10), clientId: uuid(11), version: 1, content: content(), updatedAt: NOW };

  it('accepts a version with its update time', () => {
    expect(PlanSchema.parse(plan).version).toBe(1);
  });

  it('accepts the empty version 0 without an update time', () => {
    expect(PlanSchema.parse({ ...plan, version: 0, content: { blocks: [] }, updatedAt: null }).version).toBe(0);
  });

  it('rejects a negative version', () => {
    expect(PlanSchema.safeParse({ ...plan, version: -1 }).success).toBe(false);
  });
});

describe('PutPlanRequestSchema', () => {
  it('accepts a base version of 0 with content', () => {
    expect(PutPlanRequestSchema.safeParse({ baseVersion: 0, content: content() }).success).toBe(true);
  });

  it('rejects a negative base version', () => {
    expect(PutPlanRequestSchema.safeParse({ baseVersion: -1, content: content() }).success).toBe(false);
  });

  it('rejects content with duplicate keys', () => {
    expect(
      PutPlanRequestSchema.safeParse({
        baseVersion: 0,
        content: content([
          { key: uuid(1), title: 'A', workouts: [] },
          { key: uuid(1), title: 'B', workouts: [] },
        ]),
      }).success,
    ).toBe(false);
  });
});

describe('PlanVersionsPageSchema', () => {
  const summary = { version: 2, createdAt: NOW };

  it('accepts a page of version summaries with a next cursor', () => {
    expect(PlanVersionsPageSchema.parse({ items: [summary], nextCursor: 'c1' })).toEqual({
      items: [summary],
      nextCursor: 'c1',
    });
  });

  it('accepts the last page with a null cursor', () => {
    expect(PlanVersionsPageSchema.parse({ items: [], nextCursor: null })).toEqual({ items: [], nextCursor: null });
  });

  it('rejects version 0, which has no row', () => {
    expect(PlanVersionsPageSchema.safeParse({ items: [{ ...summary, version: 0 }], nextCursor: null }).success).toBe(false);
  });
});

describe('ClientPlansResponseSchema', () => {
  const plan = { linkId: uuid(10), clientId: uuid(11), version: 1, content: content(), updatedAt: NOW };

  it('accepts the plans of open links', () => {
    expect(ClientPlansResponseSchema.parse({ items: [plan] }).items).toHaveLength(1);
  });

  it('rejects a bare array', () => {
    expect(ClientPlansResponseSchema.safeParse([plan]).success).toBe(false);
  });
});
