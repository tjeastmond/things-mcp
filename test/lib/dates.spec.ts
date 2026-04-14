import { describe, expect, it } from 'vitest';
import { parseAppleScriptSeconds, parseIsoToUnixSeconds, unixSecondsToIso } from '../../src/lib/dates.js';

describe('dates', () => {
  it('parses scientific notation from AppleScript', () => {
    expect(parseAppleScriptSeconds('1.776186055E+9')).toBe(1776186055);
  });

  it('roundtrips unix to ISO', () => {
    expect(unixSecondsToIso(1700000000)).toBe(new Date(1700000000 * 1000).toISOString());
  });

  it('parses ISO input', () => {
    const u = parseIsoToUnixSeconds('2026-04-14T12:00:00.000Z');
    expect(u).toBe(Math.floor(Date.parse('2026-04-14T12:00:00.000Z') / 1000));
  });
});
