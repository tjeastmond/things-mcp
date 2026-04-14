import { describe, expect, it } from 'vitest';
import { unescapeCField } from '../../src/lib/text.js';

describe('unescapeCField', () => {
  it('unescapes newline tab and backslash', () => {
    expect(unescapeCField('a\\nb\\tc\\\\')).toBe('a\nb\tc\\');
  });

  it('leaves unknown escapes as literal backslash plus char', () => {
    expect(unescapeCField('a\\xb')).toBe('a\\xb');
  });
});
