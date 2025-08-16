import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

import BrowseFilters from '@/components/molecules/BrowseFilters';

describe('BrowseFilters additional branches', () => {
  it('toggles Show more/less for categories', async () => {
    const user = userEvent.setup();
    const useCases = Array.from({ length: 2 }).map((_, i) => ({ id: 'u'+i, slug: 's'+i, label: 'UC'+i }));
    const categories = Array.from({ length: 10 }).map((_, i) => ({ id: 'c'+i, slug: 'cat'+i, name: 'Cat'+i }));
    render(<BrowseFilters useCases={useCases} categories={categories} current={{ sort: 'new' }} />);
    const btn = screen.getByRole('button', { name: /show more \(2\)/i });
    await user.click(btn);
    expect(screen.getByRole('button', { name: /show less/i })).toBeInTheDocument();
  });
});

