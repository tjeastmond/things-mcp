/** Parse seconds from AppleScript date subtraction (may be scientific notation). */
export function parseAppleScriptSeconds(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n);
}

/** Normalize to ISO 8601 (UTC) from unix seconds. */
export function unixSecondsToIso(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

/** Parse user ISO date/datetime string to unix seconds (local interpretation via Date). */
export function parseIsoToUnixSeconds(iso: string): number | undefined {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return undefined;
  return Math.floor(ms / 1000);
}
