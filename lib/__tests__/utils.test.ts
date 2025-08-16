import { describe, it, expect } from 'vitest';
import { cn, slugify, TAILWIND_COLORS, badgeColorMap } from '@/lib/utils';

describe('utils', () => {
  it('cn merges class names and removes duplicates', () => {
    const out = cn('p-2', 'text-sm', ['p-2', { hidden: false, block: true }]);
    const tokens = out.split(/\s+/).sort();
    expect(tokens).toEqual(['block', 'p-2', 'text-sm'].sort());
  });

  it('slugify lowercases and strips special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('   Multiple   Spaces ')).toBe('multiple-spaces');
  });

  it('badgeColorMap has entries for each tailwind color', () => {
    for (const c of TAILWIND_COLORS) {
      expect(badgeColorMap[c]).toBeDefined();
      expect(badgeColorMap[c]).toContain(`bg-${c}-100`);
      expect(badgeColorMap[c]).toContain(`text-${c}-800`);
      expect(badgeColorMap[c]).toContain(`border-${c}-300`);
    }
  });
});
