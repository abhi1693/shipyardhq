import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => {
  const productBadge = {
    findFirst: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
  };
  const product = {
    findUnique: vi.fn(async () => ({ createdAt: new Date(Date.now()) })),
  };
  return { default: { productBadge, product } };
});

import prisma from '@/lib/prisma';
import '@/lib/server/badges';
import { publish } from '@/lib/server/events';

describe('badges listeners', () => {
  beforeEach(() => {
    (prisma as any).productBadge.findFirst.mockClear();
    (prisma as any).productBadge.create.mockClear();
    (prisma as any).productBadge.update.mockClear();
    (prisma as any).product.findUnique.mockClear();
  });

  it('assigns new badge on product.created', async () => {
    await publish('product.created', { productId: 'p1' });
    expect((prisma as any).productBadge.create).toHaveBeenCalled();
  });

  it('applies default expiry for trending badge', async () => {
    await publish('badge.assigned', { id: 'b1', productId: 'p1', badge: 'trending' });
    expect((prisma as any).productBadge.update).toHaveBeenCalled();
  });

  it('refreshes expiresAt when existing badge has none', async () => {
    (prisma as any).productBadge.findFirst.mockResolvedValueOnce({ id: 'x', expiresAt: null });
    await publish('product.created', { productId: 'p2' });
    expect((prisma as any).productBadge.update).toHaveBeenCalled();
  });

  it('logs errors and continues', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (prisma as any).productBadge.create.mockRejectedValueOnce(new Error('nope'));
    await publish('product.created', { productId: 'p3' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    (prisma as any).productBadge.create.mockResolvedValue({});
  });
});
  it('does not set expiry for editor-pick', async () => {
    (prisma as any).productBadge.update.mockClear();
    await publish('badge.assigned', { id: 'b2', productId: 'p1', badge: 'editor-pick' });
    expect((prisma as any).productBadge.update).not.toHaveBeenCalled();
  });

  it('product.updated within 7 days ensures new badge', async () => {
    // Clear mocks
    (prisma as any).product.findUnique.mockResolvedValueOnce({ createdAt: new Date() });
    ;(prisma as any).productBadge.findFirst.mockResolvedValueOnce(null);
    await publish('product.updated', { productId: 'p5' });
    expect((prisma as any).productBadge.create).toHaveBeenCalled();
  });

  it('handles product.deleted event (no-op)', async () => {
    await publish('product.deleted', { productId: 'p6' });
    expect(true).toBe(true);
  });
  it('badge.assigned default branch does nothing for unknown badge', async () => {
    (prisma as any).productBadge.update.mockClear();
    await publish('badge.assigned', { id: 'b3', productId: 'p1', badge: 'unknown' });
    expect((prisma as any).productBadge.update).not.toHaveBeenCalled();
  });

  it('logs errors in badge.assigned catch', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (prisma as any).productBadge.update.mockRejectedValueOnce(new Error('nope'));
    await publish('badge.assigned', { id: 'b4', productId: 'p1', badge: 'featured' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    (prisma as any).productBadge.update.mockResolvedValue({});
  });

  it('logs errors in product.updated catch', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (prisma as any).product.findUnique.mockRejectedValueOnce(new Error('nope'));
    await publish('product.updated', { productId: 'p6' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    (prisma as any).product.findUnique.mockResolvedValue({ createdAt: new Date() });
  });

  it('applies default expiry for new badge', async () => {
    (prisma as any).productBadge.update.mockClear();
    await publish('badge.assigned', { id: 'bN', productId: 'p1', badge: 'new' });
    expect((prisma as any).productBadge.update).toHaveBeenCalled();
  });

  it('respects provided expiresAt and returns early', async () => {
    (prisma as any).productBadge.update.mockClear();
    const future = new Date(Date.now() + 1000);
    await publish('badge.assigned', { id: 'b5', productId: 'p1', badge: 'featured', expiresAt: future });
    expect((prisma as any).productBadge.update).not.toHaveBeenCalled();
  });

  it('product.updated returns early when product not found', async () => {
    (prisma as any).productBadge.create.mockClear();
    (prisma as any).product.findUnique.mockResolvedValueOnce(null);
    await publish('product.updated', { productId: 'missing' });
    expect((prisma as any).productBadge.create).not.toHaveBeenCalled();
  });
