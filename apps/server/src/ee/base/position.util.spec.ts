import { generateKeyBetween, positionAfter } from './position.util';

describe('position.util', () => {
  it('generates a mid key between null and null', () => {
    const k = generateKeyBetween(null, null);
    expect(typeof k).toBe('string');
    expect(k.length).toBeGreaterThan(0);
  });

  it('generates a key after a given position', () => {
    const first = generateKeyBetween(null, null);
    const second = positionAfter(first);
    expect(second > first).toBe(true);
  });

  it('generates a key before a given position', () => {
    const first = generateKeyBetween(null, null);
    const before = generateKeyBetween(null, first);
    expect(before < first).toBe(true);
  });

  it('generates a key strictly between two neighbors', () => {
    const a = generateKeyBetween(null, null);
    const b = positionAfter(a);
    const mid = generateKeyBetween(a, b);
    expect(mid > a && mid < b).toBe(true);
  });

  it('produces stable ordering across many appends', () => {
    let prev: string | null = null;
    const keys: string[] = [];
    for (let i = 0; i < 20; i++) {
      const k = positionAfter(prev);
      keys.push(k);
      prev = k;
    }
    const sorted = [...keys].sort();
    expect(sorted).toEqual(keys);
  });

  it('throws when lower >= upper', () => {
    expect(() => generateKeyBetween('b', 'a')).toThrow();
  });
});
