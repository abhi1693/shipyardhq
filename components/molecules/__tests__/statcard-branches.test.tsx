import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/molecules/StatCard';

describe('StatCard branch coverage', () => {
  it('renders down trend, tooltip, icon, progress clamping, and no sparkline', () => {
    const { rerender, container } = render(
      <StatCard
        title="Sessions"
        value={9876}
        badge="-5%"
        badgeVariant="default"
        subheading="Last 7 days"
        footnote="Compared to previous period"
        trend="down"
        icon={<span>ICO</span>}
        tooltip="Tip text"
        progress={150}
        sparkline={[1]}
      />,
    );
    expect(screen.getByText('Sessions')).toBeInTheDocument();
    // Compact number formatting
    expect(screen.getByText('9.9K')).toBeInTheDocument();
    // Down-trend badge text rendered
    expect(screen.getByText('-5%')).toBeInTheDocument();
    // Tooltip appears as title attribute on outer card element
    expect(container.querySelector('[title="Tip text"]')).toBeTruthy();
    // Icon wrapper content
    expect(screen.getByText('ICO')).toBeInTheDocument();
    // Progress clamped to 100%
    const bar = container.querySelector('[style*="width: 100%"]');
    expect(bar).toBeTruthy();
    // No sparkline when less than 2 points (scope to sparkline viewBox)
    expect(container.querySelector('svg[viewBox="0 0 100 24"] path')).toBeFalsy();

    // Progress clamped to 0%
    rerender(
      <StatCard
        title="Sessions"
        value={9876}
        trend="down"
        progress={-10}
      />,
    );
    const zeroBar = container.querySelector('[style*="width: 0%"]');
    expect(zeroBar).toBeTruthy();
  });
});
