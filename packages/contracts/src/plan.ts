import { z } from 'zod';
import { IsoDateTimeSchema, UuidSchema, cursorPage } from './common';

// Limits are the single source for both API validation and client forms.
export const PLAN_LIMITS = {
  textMin: 1,
  titleMax: 80,
  noteMax: 280,
  blocksMax: 20,
  workoutsPerBlockMax: 14,
  exercisesPerWorkoutMin: 1,
  exercisesPerWorkoutMax: 30,
  setsMin: 1,
  setsMax: 20,
  repsMin: 1,
  repsMax: 100,
  weightKgMin: 0,
  weightKgMax: 500,
  weightKgStep: 0.25,
  restSecMin: 0,
  restSecMax: 900,
} as const;

const TextSchema = z.string().trim().min(PLAN_LIMITS.textMin).max(PLAN_LIMITS.titleMax);

export const ExerciseSchema = z
  .object({
    key: UuidSchema,
    name: TextSchema,
    sets: z.number().int().min(PLAN_LIMITS.setsMin).max(PLAN_LIMITS.setsMax),
    repsMin: z.number().int().min(PLAN_LIMITS.repsMin).max(PLAN_LIMITS.repsMax),
    repsMax: z.number().int().min(PLAN_LIMITS.repsMin).max(PLAN_LIMITS.repsMax),
    weightKg: z
      .number()
      .min(PLAN_LIMITS.weightKgMin)
      .max(PLAN_LIMITS.weightKgMax)
      .multipleOf(PLAN_LIMITS.weightKgStep)
      .nullable(),
    restSec: z.number().int().min(PLAN_LIMITS.restSecMin).max(PLAN_LIMITS.restSecMax).nullable(),
    note: z.string().trim().max(PLAN_LIMITS.noteMax).nullable(),
  })
  .refine((exercise) => exercise.repsMax >= exercise.repsMin, {
    path: ['repsMax'],
    error: 'repsMax must be greater than or equal to repsMin',
  });
export type Exercise = z.infer<typeof ExerciseSchema>;

export const WorkoutSchema = z.object({
  key: UuidSchema,
  title: TextSchema,
  exercises: z
    .array(ExerciseSchema)
    .min(PLAN_LIMITS.exercisesPerWorkoutMin)
    .max(PLAN_LIMITS.exercisesPerWorkoutMax),
});
export type Workout = z.infer<typeof WorkoutSchema>;

export const BlockSchema = z.object({
  key: UuidSchema,
  title: TextSchema,
  workouts: z.array(WorkoutSchema).max(PLAN_LIMITS.workoutsPerBlockMax),
});
export type Block = z.infer<typeof BlockSchema>;

// Keys address workouts and exercises across versions, so one key may appear only once in the whole document.
export const PlanContentSchema = z
  .object({
    blocks: z.array(BlockSchema).max(PLAN_LIMITS.blocksMax),
  })
  .refine(
    (content) => {
      const keys = content.blocks.flatMap((block) => [
        block.key,
        ...block.workouts.flatMap((workout) => [workout.key, ...workout.exercises.map((exercise) => exercise.key)]),
      ]);
      return new Set(keys).size === keys.length;
    },
    { error: 'Keys must be unique across the whole plan' },
  );
export type PlanContent = z.infer<typeof PlanContentSchema>;

// Version 0 is the empty plan and has no row, so updatedAt is null only then.
export const PlanSchema = z.object({
  linkId: UuidSchema,
  clientId: UuidSchema,
  version: z.number().int().min(0),
  content: PlanContentSchema,
  updatedAt: IsoDateTimeSchema.nullable(),
});
export type Plan = z.infer<typeof PlanSchema>;

export const PutPlanRequestSchema = z.object({
  baseVersion: z.number().int().min(0),
  content: PlanContentSchema,
});
export type PutPlanRequest = z.infer<typeof PutPlanRequestSchema>;

export const PlanVersionSummarySchema = z.object({
  version: z.number().int().min(1),
  createdAt: IsoDateTimeSchema,
});
export type PlanVersionSummary = z.infer<typeof PlanVersionSummarySchema>;

export const PlanVersionsPageSchema = cursorPage(PlanVersionSummarySchema);
export type PlanVersionsPage = z.infer<typeof PlanVersionsPageSchema>;

export const ClientPlansResponseSchema = z.object({
  items: z.array(PlanSchema),
});
export type ClientPlansResponse = z.infer<typeof ClientPlansResponseSchema>;
