import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { Breadcrumbs } from '@/components/molecules/BreadCrumbs';
vi.mock('next/navigation', () => ({
  usePathname: () => '/x/y',
}));

describe('Breadcrumbs additional branches', () => {
  it('does not inject Home when first title equals Home regardless of link', () => {
    render(
      <Breadcrumbs items={[{ title: 'Home', link: '#'}, { title: 'Section', link: '/s' }, { title: 'Item' }]} />
    );
    const links = screen.getAllByRole('link');
    // First link remains Home; no duplicate
    expect(links[0]).toHaveTextContent('Home');
    // Only two links should exist (Home, Section); last is page
    const page = document.querySelector('[data-slot="breadcrumb-page"]');
    expect(page?.textContent).toBe('Item');
  });

  it('injects Home before prefix items when first is not home', () => {
    render(
      <Breadcrumbs
        prefixItems={[{ title: 'Org', link: '/org' }]}
        items={[{ title: 'Team', link: '/org/team' }, { title: 'Members' }]}
      />
    );
    const links = screen.getAllByRole('link');
    // Home should be injected first
    expect(links[0]).toHaveTextContent('Home');
    expect(links[1]).toHaveTextContent('Org');
    expect(links[2]).toHaveTextContent('Team');
  });

  it('uses useBreadcrumbs fallback when no items are provided', () => {
    render(<Breadcrumbs />);
    // With mocked pathname '/x/y' we expect Home, X, and current page Y
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveTextContent('Home');
    expect(links[1]).toHaveTextContent('X');
    const page = document.querySelector('[data-slot="breadcrumb-page"]');
    expect(page?.textContent).toBe('Y');
  });
});
