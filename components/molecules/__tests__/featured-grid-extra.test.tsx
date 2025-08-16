import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import FeaturedProductGrid from '@/components/molecules/FeaturedProductGrid';

describe('FeaturedProductGrid extra slot', () => {
  it('renders extra card when provided', () => {
    const items = [
      {
        id: 'fb1',
        product: {
          id: 'p1', slug: 'a', name: 'A', logo: '/a.png', tagline: 't',
          ProductBadge: [], analytics: { upvotes: 0 }, user: { firstName: 'U', lastName: 'S' }, category: { name: 'Cat' },
        },
      },
    ];
    render(
      <FeaturedProductGrid items={items as any} extra={<div data-testid="extra">X</div>} />,
    );
    expect(screen.getByTestId('extra')).toBeInTheDocument();
  });
});

