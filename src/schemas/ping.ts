import { z } from 'zod';

/** `things_ping` accepts no arguments; unknown keys are rejected. */
export const thingsPingInputSchema = z.object({}).strict();

export const thingsPingOutputSchema = z.object({
  ok: z.literal(true),
  version: z.string(),
});

export type ThingsPingOutput = z.infer<typeof thingsPingOutputSchema>;
