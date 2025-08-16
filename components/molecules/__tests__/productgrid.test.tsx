import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/molecules/ProductList', () => ({
  __esModule: true,
  default: ({ items }: any) => <div data-testid="list-count">{items.length}</div>,
}));

import ProductGrid from '@/components/molecules/ProductGrid';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch as any);

describe('ProductGrid', () => {
  it('renders list and loads more products on click', async () => {
    const now = Date.now();
    const p1: any = {
      id: '1', title: 'A', category: {}, user: {}, analytics: null, verification: { isVerified: true },
      ProductBadge: [{ badge: 'new', expiresAt: new Date(now + 1000).toISOString() }, { badge: 'old', expiresAt: new Date(now - 1000).toISOString() }],
    };
    const p2: any = { id: '2', title: 'B', category: {}, user: {}, analytics: null, verification: null, ProductBadge: [] };

    mockFetch.mockResolvedValueOnce({
      json: async () => ({ products: [ { id: '3', title: 'C', category: {}, user: {}, analytics: null, verification: null, ProductBadge: [] } ], hasMore: false }),
    } as any);

    render(<ProductGrid initialProducts={[p1, p2]} initialHasMore={true} searchParams={{ useCase: 'x', category: 'y', sort: 'recent', verified: true }} />);

    // Our mock renders the count of items
    expect(screen.getByTestId('list-count').textContent).toBe('2');
    const btn = screen.getByRole('button', { name: 'Load More' });
    const user = userEvent.setup();
    await user.click(btn);
    await waitFor(() => expect(btn).toBeDisabled());
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    // After load, list should have grown to 3; button hidden as hasMore becomes false
    await waitFor(() => expect(screen.getByTestId('list-count').textContent).toBe('3'));
    expect(screen.queryByRole('button', { name: 'Load More' })).toBeNull();
  });
});

