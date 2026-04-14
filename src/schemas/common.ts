import { z } from 'zod';

export const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(100)
  .optional()
  .default(25);
