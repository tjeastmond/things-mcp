import { log } from '../lib/logger.js';
import { ThingsError } from '../lib/errors.js';
import { parseIsoToUnixSeconds } from '../lib/dates.js';
import { runOsascript } from './osascript.js';
import {
  buildAddTodoScript,
  buildCompleteTodoScript,
  buildDeleteTodoScript,
  buildListInboxScript,
  buildListTodayScript,
  buildSearchScript,
  type AddTodoScriptParams,
} from './scripts.js';
import { parseCompleteRow, parseTodoRow, parseTodoRows } from './parsers.js';
import { listResult } from './mappers.js';
import type { ListTodosResult, TodoDetail } from './types.js';

export type AddTodoInput = {
  title: string;
  notes?: string;
  project?: string;
  area?: string;
  /** ISO 8601 datetime or date, or shortcuts: today|inbox|anytime|someday */
  when?: string;
  deadline?: string;
  tags?: string[];
};

function resolveWhen(when?: string): {
  listName: 'Inbox' | 'Today' | 'Anytime' | 'Someday';
  activationUnix?: number;
} {
  if (!when?.trim()) return { listName: 'Inbox' };
  const t = when.trim();
  const lower = t.toLowerCase();
  if (lower === 'today') return { listName: 'Today' };
  if (lower === 'anytime') return { listName: 'Anytime' };
  if (lower === 'someday') return { listName: 'Someday' };
  if (lower === 'inbox') return { listName: 'Inbox' };
  const activationUnix = parseIsoToUnixSeconds(t);
  if (activationUnix === undefined) {
    throw new ThingsError(
      'things_validation_error',
      'when must be ISO 8601 or one of: inbox, today, anytime, someday.',
    );
  }
  return { listName: 'Inbox', activationUnix };
}

export async function listInbox(limit: number): Promise<ListTodosResult> {
  const script = buildListInboxScript(limit);
  if (process.env.THINGS_MCP_LOG === 'debug') {
    log.debug(`things_list_inbox script bytes=${script.length}`);
  }
  const { stdout } = await runOsascript(script);
  const items = parseTodoRows(stdout);
  return listResult(items);
}

export async function listToday(limit: number): Promise<ListTodosResult> {
  const { stdout } = await runOsascript(buildListTodayScript(limit));
  const items = parseTodoRows(stdout);
  return listResult(items);
}

export async function searchTodos(query: string, limit: number): Promise<ListTodosResult> {
  const { stdout } = await runOsascript(buildSearchScript(query, limit));
  const items = parseTodoRows(stdout);
  return listResult(items);
}

export async function addTodo(input: AddTodoInput): Promise<TodoDetail> {
  const title = input.title.trim();
  if (!title) {
    throw new ThingsError('things_validation_error', 'title must not be empty.');
  }
  if (input.project?.trim() && input.area?.trim()) {
    throw new ThingsError(
      'things_validation_error',
      'Specify either project or area, not both.',
    );
  }
  const tagNames = input.tags?.length ? input.tags.join(', ') : '';
  const { listName, activationUnix: whenActivation } = resolveWhen(input.when);
  const deadlineUnix = input.deadline ? parseIsoToUnixSeconds(input.deadline) : undefined;
  if (input.deadline && deadlineUnix === undefined) {
    throw new ThingsError('things_validation_error', 'deadline must be a valid ISO 8601 date or datetime.');
  }

  const params: AddTodoScriptParams = {
    title,
    notes: input.notes ?? '',
    tagNames,
    listName,
    projectName: input.project?.trim() || undefined,
    areaName: input.area?.trim() || undefined,
    deadlineUnix,
    activationUnix: whenActivation,
  };

  const { stdout } = await runOsascript(buildAddTodoScript(params));
  const line = stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
  if (!line) {
    throw new ThingsError('things_parse_error', 'add todo returned no data.');
  }
  const detail: TodoDetail = { ...parseTodoRow(line), status: 'open' };
  return detail;
}

export async function completeTodo(id: string): Promise<{ id: string; title: string; status: string }> {
  const trimmed = id.trim();
  if (!trimmed) {
    throw new ThingsError('things_validation_error', 'id must not be empty.');
  }
  const { stdout } = await runOsascript(buildCompleteTodoScript(trimmed));
  const line = stdout.split(/\r?\n/).find((l) => l.trim().length > 0);
  if (!line) {
    throw new ThingsError('things_parse_error', 'complete todo returned no data.');
  }
  return parseCompleteRow(line);
}

/** Deletes a to-do by id (moves it to Trash). Intended for tests and cleanup. */
export async function deleteTodo(id: string): Promise<void> {
  const trimmed = id.trim();
  if (!trimmed) {
    throw new ThingsError('things_validation_error', 'id must not be empty.');
  }
  await runOsascript(buildDeleteTodoScript(trimmed));
}
