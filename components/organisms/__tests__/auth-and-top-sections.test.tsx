import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock Clerk UI components used by AuthFormPanel
vi.mock('@clerk/nextjs', () => ({
  SignIn: () => <div data-testid="sign-in" />,
  SignUp: () => <div data-testid="sign-up" />,
}));

import AuthFormPanel from '@/components/organisms/AuthFormPanel';
import AuthMarketingPanel from '@/components/organisms/AuthMarketingPanel';
import { TopCategories } from '@/components/organisms/TopCategories';
import { Leaderboard } from '@/components/organisms/Leaderboard';

describe('AuthFormPanel', () => {
  it('renders sign-in variant with heading and legal links', () => {
    render(<AuthFormPanel mode="sign-in" />);
    expect(screen.getByText('Sign in to ShipYard')).toBeInTheDocument();
    expect(screen.getByTestId('sign-in')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
      'href',
      '/terms',
    );
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });

  it('renders sign-up variant with different heading', () => {
    render(<AuthFormPanel mode="sign-up" />);
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByTestId('sign-up')).toBeInTheDocument();
  });
});

describe('AuthMarketingPanel', () => {
  it('shows brand, hero copy, features and testimonial', () => {
    render(<AuthMarketingPanel />);
    expect(screen.getByText('ShipYard')).toBeInTheDocument();
    expect(screen.getByText('Discover. Launch. Grow.')).toBeInTheDocument();
    expect(screen.getByText('400+ Micro-SaaS projects listed')).toBeInTheDocument();
    // Testimonial author
    expect(screen.getByText('Maya Chen')).toBeInTheDocument();
  });
});

describe('Top sections', () => {
  it('TopCategories renders a grid of category cards', () => {
    const categories = [
      {
        id: '1',
        name: 'Analytics',
        slug: 'analytics',
        description: 'Track metrics',
        icon: 'BarChart',
        _count: { products: 10 },
      },
      {
        id: '2',
        name: 'Email',
        slug: 'email',
        description: 'Send newsletters',
        icon: 'Mail',
        _count: { products: 5 },
      },
    ];
    render(<TopCategories categories={categories as any} />);
    // Names visible and links point to category pages
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.some((a) => a.getAttribute('href') === '/categories/analytics')).toBe(
      true,
    );
  });

  it('Leaderboard renders nothing when empty and shows CTA when populated', () => {
    const { container, rerender } = render(<Leaderboard products={[]} as any />);
    expect(container.firstChild).toBeNull();

    rerender(
      <Leaderboard
        products={[
          {
            id: 'fb1',
            product: {
              id: 'p1',
              slug: 'a',
              name: 'A',
              logo: '/a.png',
              tagline: 'tag',
              ProductBadge: [],
              analytics: { upvotes: 2 },
              user: { firstName: 'A', lastName: 'B' },
              category: { name: 'Cat' },
            },
          },
          {
            id: 'fb2',
            product: {
              id: 'p2',
              slug: 'b',
              name: 'B',
              logo: '/b.png',
              tagline: 'tag',
              ProductBadge: [],
              analytics: { upvotes: 1 },
              user: { firstName: 'C', lastName: 'D' },
              category: { name: 'Cat' },
            },
          },
        ] as any}
      />,
    );
    expect(screen.getByText('Trending')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See leaderboard' })).toHaveAttribute(
      'href',
      '/leaderboard',
    );
  });
});
