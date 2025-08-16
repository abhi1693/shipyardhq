import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/molecules/FeaturedProductGrid', () => ({
  __esModule: true,
  default: ({ items }: any) => <div data-testid="featured-count">{items.length}</div>,
}));

import AsideFeatured from '@/components/organisms/AsideFeatured';

describe('AsideFeatured', () => {
  it('returns null when no products', () => {
    const { container } = render(<AsideFeatured products={[]} /> as any);
    expect(container.firstChild).toBeNull();
  });

  it('renders title and grid of up to 6 products', () => {
    const products = Array.from({ length: 10 }).map((_, i) => ({ id: String(i) })) as any;
    render(<AsideFeatured products={products} title="My Picks" /> as any);
    expect(screen.getByText('My Picks')).toBeInTheDocument();
    expect(screen.getByText('Curated picks')).toBeInTheDocument();
    expect(screen.getByTestId('featured-count').textContent).toBe('6');
  });
});

