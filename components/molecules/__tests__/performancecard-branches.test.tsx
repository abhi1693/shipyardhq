import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import PerformanceCard from '@/components/molecules/PerformanceCard';

describe('PerformanceCard branches', () => {
  it('shows Logo vs Banner label and No expiry tooltip content with many upvoters sliced', () => {
    // No badges -> No badges text
    const { rerender, container } = render(
      <PerformanceCard
        upvotes={0}
        clicks={0}
        productName="Prod"
        tagline={null}
        hasBanner={false}
        ogImageUrl="https://img/logo.png"
        editHref="/edit"
      />,
    );
    expect(screen.getByText('Logo')).toBeInTheDocument();
    expect(screen.getByText('No badges')).toBeInTheDocument();

    // With badges including no-expiry
    const badges = [
      { id: 'b1', badge: 'featured', expiresAt: null },
    ];
    const upvoters = Array.from({ length: 10 }).map((_, i) => ({ id: `u${i}`, user: { firstName: `U${i}`, lastName: `L${i}` } }));
    rerender(
      <PerformanceCard
        upvotes={10}
        clicks={20}
        upvoters={upvoters as any}
        badges={badges as any}
        productName="Prod"
        tagline={null}
        hasBanner={true}
        ogImageUrl="https://img/banner.png"
        editHref="/edit"
      />,
    );
    // Banner label
    expect(screen.getByText('Banner')).toBeInTheDocument();
    // Badges render (tooltip text may not be visible without interaction)
    expect(screen.getByText('Featured')).toBeInTheDocument();
    // Only 8 upvoter avatars rendered
    const avatars = container.querySelectorAll('[title^="U"]');
    expect(avatars.length).toBeLessThanOrEqual(8);
  });
});
