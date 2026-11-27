import { PutPlanRequestSchema, type Plan, type PlanContent } from '@noexcuse/contracts';
import { randomUUID } from 'expo-crypto';
import type { Control } from 'react-hook-form';
import { z } from 'zod';

const DEFAULT_SETS = '3';
const DEFAULT_REPS_MIN = '8';
const DEFAULT_REPS_MAX = '12';

// Inputs hold text so partial input such as "1." is representable; the schema sees numbers and nulls.
const ExerciseFormSchema = z.object({
  key: z.string(),
  name: z.string(),
  sets: z.string(),
  repsMin: z.string(),
  repsMax: z.string(),
  weightKg: z.string(),
  restSec: z.string(),
  note: z.string(),
});

const WorkoutFormSchema = z.object({
  key: z.string(),
  title: z.string(),
  exercises: z.array(ExerciseFormSchema),
});

const BlockFormSchema = z.object({
  key: z.string(),
  title: z.string(),
  workouts: z.array(WorkoutFormSchema),
});

const ContentFormSchema = z.object({ blocks: z.array(BlockFormSchema) });

export type ExerciseFormValues = z.input<typeof ExerciseFormSchema>;
export type WorkoutFormValues = z.input<typeof WorkoutFormSchema>;
export type BlockFormValues = z.input<typeof BlockFormSchema>;
type ContentFormValues = z.input<typeof ContentFormSchema>;

// Empty required numbers become NaN so the schema reports them instead of silently coercing to zero.
const toRequiredNumber = (text: string): number => (text.trim() === '' ? Number.NaN : Number(text));
const toOptionalNumber = (text: string): number | null => (text.trim() === '' ? null : Number(text));
const toOptionalText = (text: string): string | null => (text.trim() === '' ? null : text.trim());

const toExercise = (exercise: ExerciseFormValues): ExerciseContent => ({
  key: exercise.key,
  name: exercise.name,
  sets: toRequiredNumber(exercise.sets),
  repsMin: toRequiredNumber(exercise.repsMin),
  repsMax: toRequiredNumber(exercise.repsMax),
  weightKg: toOptionalNumber(exercise.weightKg),
  restSec: toOptionalNumber(exercise.restSec),
  note: toOptionalText(exercise.note),
});

const toPlanContent = (values: ContentFormValues): PlanContent => ({
  blocks: values.blocks.map((block) => ({
    key: block.key,
    title: block.title,
    workouts: block.workouts.map((workout) => ({
      key: workout.key,
      title: workout.title,
      exercises: workout.exercises.map(toExercise),
    })),
  })),
});

// baseVersion travels as a hidden form value, so the parsed output is the whole PutPlanRequest body.
export const PlanFormSchema = z
  .object({ baseVersion: z.number(), content: ContentFormSchema })
  .transform(({ baseVersion, content }) => ({ baseVersion, content: toPlanContent(content) }))
  .pipe(PutPlanRequestSchema);

export type PlanFormValues = z.input<typeof PlanFormSchema>;
export type PlanFormOutput = z.output<typeof PlanFormSchema>;
export type PlanControl = Control<PlanFormValues, unknown, PlanFormOutput>;

// Template types keep nested field array and field names checked by RHF.
export type BlockPath = `content.blocks.${number}`;
export type WorkoutPath = `${BlockPath}.workouts.${number}`;
export type ExercisePath = `${WorkoutPath}.exercises.${number}`;

type ExerciseContent = PlanContent['blocks'][number]['workouts'][number]['exercises'][number];

const numberText = (value: number | null): string => (value === null ? '' : String(value));

const fromExercise = (exercise: ExerciseContent): ExerciseFormValues => ({
  key: exercise.key,
  name: exercise.name,
  sets: String(exercise.sets),
  repsMin: String(exercise.repsMin),
  repsMax: String(exercise.repsMax),
  weightKg: numberText(exercise.weightKg),
  restSec: numberText(exercise.restSec),
  note: exercise.note ?? '',
});

export const fromPlanContent = (content: PlanContent): ContentFormValues => ({
  blocks: content.blocks.map((block) => ({
    key: block.key,
    title: block.title,
    workouts: block.workouts.map((workout) => ({
      key: workout.key,
      title: workout.title,
      exercises: workout.exercises.map(fromExercise),
    })),
  })),
});

export const fromPlan = (plan: Plan): PlanFormValues => ({
  baseVersion: plan.version,
  content: fromPlanContent(plan.content),
});

export const newBlock = (): BlockFormValues => ({ key: randomUUID(), title: '', workouts: [] });

export const newWorkout = (): WorkoutFormValues => ({ key: randomUUID(), title: '', exercises: [] });

export const newExercise = (): ExerciseFormValues => ({
  key: randomUUID(),
  name: '',
  sets: DEFAULT_SETS,
  repsMin: DEFAULT_REPS_MIN,
  repsMax: DEFAULT_REPS_MAX,
  weightKg: '',
  restSec: '',
  note: '',
});
