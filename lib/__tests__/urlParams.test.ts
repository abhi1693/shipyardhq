import { describe, it, expect } from 'vitest';
import { pickFirst, buildQuery } from '@/lib/urlParams';

describe('urlParams', () => {
  it('pickFirst returns first element of array', () => {
    expect(pickFirst(['a', 'b'])).toBe('a');
  });

  it('pickFirst returns string as-is', () => {
    expect(pickFirst('abc')).toBe('abc');
  });

  it('pickFirst returns undefined when undefined', () => {
    expect(pickFirst(undefined)).toBeUndefined();
  });

  it('buildQuery merges and removes params correctly (string input)', () => {
    const out = buildQuery('/path', 'a=1&b=2', { a: '3', b: null, c: 'x' });
    expect(out).toBe('/path?a=3&c=x');
  });

  it('buildQuery with URLSearchParams input', () => {
    const current = new URLSearchParams('foo=bar&baz=qux');
    const out = buildQuery('/p', current, { baz: 'zzz', foo: false });
    expect(out).toBe('/p?baz=zzz');
  });

  it('buildQuery with null/undefined currentSearch', () => {
    expect(buildQuery('/base', null, { q: '1' })).toBe('/base?q=1');
    expect(buildQuery('/base', undefined, { q: undefined })).toBe('/base');
  });
});

