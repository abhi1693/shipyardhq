import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import FeaturedTicker from '@/components/molecules/FeaturedTicker';

describe('FeaturedTicker', () => {
  it('returns null when no items', () => {
    const { container } = render(<FeaturedTicker items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders duplicated list of items with links and images', () => {
    const items = [
      { slug: 'a', name: 'Alpha', logo: '/a.png' },
      { slug: 'b', name: 'Beta', logo: '/b.png' },
      { slug: 'c', name: 'Gamma', logo: '/c.png' },
    ];
    render(<FeaturedTicker items={items} />);
    // Duplicates the list for ticker scroll -> 6 links
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(6);
    // First link points to product page
    expect(links[0]).toHaveAttribute('href', '/products/a');
    // Should include a Featured label text
    expect(screen.getAllByText('Featured').length).toBeGreaterThan(0);
    // Images rendered with alt from name
    expect(screen.getAllByAltText(/Alpha|Beta|Gamma/).length).toBe(6);
  });
});

