import { describe, it, expect, vi } from 'vitest';
import { on, publish } from '@/lib/server/events';

describe('events bus', () => {
  it('invokes subscribed handlers with payload', async () => {
    const payload = { productId: 'p1' };
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const off1 = on('product.clicked', fn1 as any);
    const off2 = on('product.clicked', fn2 as any);
    await publish('product.clicked', payload);
    expect(fn1).toHaveBeenCalledWith(payload);
    expect(fn2).toHaveBeenCalledWith(payload);
    off1();
    off2();
  });

  it('isolates handler errors and logs them', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const good = vi.fn();
    on('product.clicked', good as any);
    on('product.clicked', () => {
      throw new Error('boom');
    });
    await publish('product.clicked', { productId: 'p2' });
    expect(good).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('returns early when publishing with no listeners', async () => {
    // There are currently no listeners for this custom event name
    await expect(publish('product.deleted', { productId: 'none' })).resolves.toBeUndefined();
  });
});
