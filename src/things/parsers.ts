import { ThingsError } from '../lib/errors.js';
import { parseAppleScriptSeconds } from '../lib/dates.js';
import { unescapeCField } from '../lib/text.js';
import type { TodoSummary } from './types.js';

const EXPECTED_FIELDS = 8;

function splitTabRow(line: string): string[] {
  return line.split('\t');
}

function parseTags(raw: string): string[] | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const parts = t.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : undefined;
}

export function parseTodoRow(line: string): TodoSummary {
  const fields = splitTabRow(line);
  if (fields.length !== EXPECTED_FIELDS) {
    throw new ThingsError(
      'things_parse_error',
      `Expected ${EXPECTED_FIELDS} tab-separated fields, got ${fields.length}.`,
    );
  }
  const [id, title, notes, act, due, tags, project, area] = fields.map(unescapeCField);
  const activation = parseAppleScriptSeconds(act);
  const deadline = parseAppleScriptSeconds(due);
  const item: TodoSummary = {
    id,
    title,
  };
  if (notes) item.notes = notes;
  if (activation !== undefined) item.when = new Date(activation * 1000).toISOString();
  if (deadline !== undefined) item.deadline = new Date(deadline * 1000).toISOString();
  const tagList = parseTags(tags);
  if (tagList) item.tags = tagList;
  if (project.trim()) item.project = project.trim();
  if (area.trim()) item.area = area.trim();
  return item;
}

export function parseTodoRows(stdout: string): TodoSummary[] {
  const lines = stdout.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const items: TodoSummary[] = [];
  for (const line of lines) {
    items.push(parseTodoRow(line));
  }
  return items;
}

export function parseCompleteRow(line: string): { id: string; title: string; status: string } {
  const fields = splitTabRow(line);
  if (fields.length !== 3) {
    throw new ThingsError('things_parse_error', `Expected 3 fields for complete result, got ${fields.length}.`);
  }
  const [id, title, status] = fields.map(unescapeCField);
  return { id, title, status };
}
