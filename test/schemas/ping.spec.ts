import { describe, expect, it } from 'vitest';
import { thingsPingInputSchema, thingsPingOutputSchema } from '../../src/schemas/ping.js';

describe('thingsPingInputSchema', () => {
  it('accepts an empty object', () => {
    expect(thingsPingInputSchema.safeParse({}).success).toBe(true);
  });

  it('rejects unknown keys', () => {
    expect(thingsPingInputSchema.safeParse({ extra: 1 }).success).toBe(false);
  });
});

describe('thingsPingOutputSchema', () => {
  it('accepts valid output', () => {
    const r = thingsPingOutputSchema.safeParse({ ok: true, version: '1.0.0' });
    expect(r.success).toBe(true);
  });

  it('rejects ok: false', () => {
    expect(thingsPingOutputSchema.safeParse({ ok: false, version: 'x' }).success).toBe(false);
  });
});
