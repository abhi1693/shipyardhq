import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProductCard } from '@/components/molecules/ProductCard';

describe('ProductCard branch coverage', () => {
  const base = {
    id: 'p1', slug: 'p1', name: 'Prod', logo: '/logo.png', tagline: 'Tag',
  };

  it('shows +N badges in compact mode when more than 3 badges', () => {
    const badges = ['featured', 'trending', 'new', 'editor-pick', 'unknown'];
    const { container } = render(
      <ProductCard product={base} badges={badges} compact upvotes={1} />,
    );
    // +2 indicator
    expect(screen.getByText('+2')).toBeInTheDocument();
    // Category chip hidden in compact mode even when provided
    expect(container.querySelector('span.ml-2')).toBeFalsy();
  });

  it('shows category chip and non-compact badges when provided', () => {
    const badges = ['featured'];
    render(
      <ProductCard product={base} badges={badges} category="AI" compact={false} upvotes={3} />,
    );
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });
});

