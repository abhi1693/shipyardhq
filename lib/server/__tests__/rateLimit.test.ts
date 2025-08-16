import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { allowOncePerWindow } from '@/lib/server/rateLimit';

describe('rateLimit allowOncePerWindow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows first call and blocks within window', () => {
    const key = 'k1';
    expect(allowOncePerWindow(key, 1000)).toBe(true);
    expect(allowOncePerWindow(key, 1000)).toBe(false);
  });

  it('re-allows after window passes', () => {
    const key = 'k2';
    expect(allowOncePerWindow(key, 1000)).toBe(true);
    vi.advanceTimersByTime(999);
    expect(allowOncePerWindow(key, 1000)).toBe(false);
    vi.advanceTimersByTime(2);
    expect(allowOncePerWindow(key, 1000)).toBe(true);
  });

  it('periodically prunes old entries after many ops', () => {
    // Create many unique keys to trigger prune branch (opCount % 1000 === 0)
    for (let i = 0; i < 1000; i++) {
      allowOncePerWindow('k' + i, 1000);
    }
  });
});
