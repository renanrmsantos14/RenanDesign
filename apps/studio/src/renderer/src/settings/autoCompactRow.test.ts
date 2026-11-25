import { describe, expect, it } from 'bun:test';
import { parseAutoCompactDraft } from './rows.js';

describe('parseAutoCompactDraft', () => {
  it('clears on empty, accepts the range with separators, and refuses the rest', () => {
    expect(parseAutoCompactDraft('')).toBeNull();
    expect(parseAutoCompactDraft('  ')).toBeNull();
    expect(parseAutoCompactDraft('300000')).toBe(300_000);
    expect(parseAutoCompactDraft('300,000')).toBe(300_000);
    expect(parseAutoCompactDraft('100000')).toBe(100_000);
    expect(parseAutoCompactDraft('1000000')).toBe(1_000_000);
    for (const bad of ['99999', '1000001', '100000.0', 'abc', '3e5', '-300000']) expect(parseAutoCompactDraft(bad)).toBeUndefined();
  });
});
