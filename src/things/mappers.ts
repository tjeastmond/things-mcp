import type { TodoSummary } from './types.js';

export function listResult(items: TodoSummary[]): { items: TodoSummary[]; count: number } {
  return { items, count: items.length };
}
