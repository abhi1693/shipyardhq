import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  default: {
    productAnalytics: {
      upsert: vi.fn(async () => ({})),
    },
  },
}));

import prisma from '@/lib/prisma';
import { publish } from '@/lib/server/events';
import { trackProductClicked } from '@/lib/server/analytics/productClicks';
import '@/lib/server/analytics/productClicks';
import '@/lib/server/analytics/productVotes';

describe('analytics listeners', () => {
  beforeEach(() => {
    (prisma.productAnalytics.upsert as any).mockClear();
  });

  it('increments clicks on product.clicked', async () => {
    await publish('product.clicked', { productId: 'p1' });
    expect(prisma.productAnalytics.upsert).toHaveBeenCalledWith({
      where: { productId: 'p1' },
      update: { clicks: { increment: 1 } },
      create: { productId: 'p1', upvotes: 0, clicks: 1 },
    });
  });

  it('helper trackProductClicked publishes event', async () => {
    (prisma.productAnalytics.upsert as any).mockClear();
    await trackProductClicked('p1');
    expect(prisma.productAnalytics.upsert).toHaveBeenCalled();
  });

  it('increments and decrements upvotes on (down)vote', async () => {
    await publish('product.upvoted', { productId: 'p2', userId: 'u' });
    expect(prisma.productAnalytics.upsert).toHaveBeenCalledWith({
      where: { productId: 'p2' },
      update: { upvotes: { increment: 1 } },
      create: { productId: 'p2', upvotes: 1, clicks: 0 },
    });
    (prisma.productAnalytics.upsert as any).mockClear();
    await publish('product.downvoted', { productId: 'p2', userId: 'u' });
    expect(prisma.productAnalytics.upsert).toHaveBeenCalledWith({
      where: { productId: 'p2' },
      update: { upvotes: { decrement: 1 } },
      create: { productId: 'p2', upvotes: 0, clicks: 0 },
    });
  });

  it('logs errors when prisma upsert fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (prisma.productAnalytics.upsert as any).mockRejectedValueOnce(new Error('x'));
    await publish('product.clicked', { productId: 'p3' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    (prisma.productAnalytics.upsert as any).mockResolvedValue({});
  });

  it('logs error on upvote/downvote failure', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (prisma.productAnalytics.upsert as any).mockRejectedValueOnce(new Error('x'));
    await publish('product.upvoted', { productId: 'p4', userId: 'u' });
    (prisma.productAnalytics.upsert as any).mockRejectedValueOnce(new Error('y'));
    await publish('product.downvoted', { productId: 'p4', userId: 'u' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    (prisma.productAnalytics.upsert as any).mockResolvedValue({});
  });
});
