import { z } from 'zod';
import { limitSchema } from './common.js';

const todoSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  notes: z.string().optional(),
  when: z.string().optional(),
  deadline: z.string().optional(),
  tags: z.array(z.string()).optional(),
  project: z.string().optional(),
  area: z.string().optional(),
});

export const listInboxInputSchema = z.object({
  limit: limitSchema,
});

export const listInboxOutputSchema = z.object({
  items: z.array(todoSummarySchema),
  count: z.number().int().nonnegative(),
});

export const listTodayInputSchema = z.object({
  limit: limitSchema,
});

export const listTodayOutputSchema = listInboxOutputSchema;

export const searchInputSchema = z.object({
  query: z.string().min(1),
  limit: limitSchema,
});

export const searchOutputSchema = listInboxOutputSchema;

export const addTodoInputSchema = z
  .object({
    title: z.string().min(1),
    notes: z.string().optional(),
    project: z.string().optional(),
    area: z.string().optional(),
    when: z.string().optional(),
    deadline: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .strict();

export const addTodoOutputSchema = z.object({
  ok: z.literal(true),
  item: todoSummarySchema.extend({ status: z.string().optional() }),
});

export const completeTodoInputSchema = z.object({
  id: z.string().min(1),
});

export const completeTodoOutputSchema = z.object({
  ok: z.literal(true),
  item: z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
  }),
});
