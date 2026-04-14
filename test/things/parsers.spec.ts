import { describe, expect, it } from 'vitest';
import { parseCompleteRow, parseTodoRow, parseTodoRows } from '../../src/things/parsers.js';

describe('parseTodoRow', () => {
  it('parses eight tab-separated fields', () => {
    const line = 'id1\ttitle1\tnote\\n2\t1700000000\t\t\t\t';
    const row = parseTodoRow(line);
    expect(row.id).toBe('id1');
    expect(row.title).toBe('title1');
    expect(row.notes).toBe('note\n2');
    expect(row.when).toBe(new Date(1700000000 * 1000).toISOString());
  });
});

describe('parseTodoRows', () => {
  it('parses multiple lines', () => {
    const out = 'a\ta\t\t\t\t\t\t\nb\tb\t\t\t\t\t\t';
    const rows = parseTodoRows(out);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.id).toBe('a');
    expect(rows[1]?.id).toBe('b');
  });
});

describe('parseCompleteRow', () => {
  it('parses three fields', () => {
    const r = parseCompleteRow('x\ty\tcompleted');
    expect(r).toEqual({ id: 'x', title: 'y', status: 'completed' });
  });
});
