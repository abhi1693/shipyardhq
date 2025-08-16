import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

import { EmptyState } from '@/components/molecules/empty-state';

describe('EmptyState', () => {
  it('renders title and description without action', () => {
    render(<EmptyState title="No Items" description="Nothing to see here" />);
    expect(screen.getByText('No Items')).toBeInTheDocument();
    expect(screen.getByText('Nothing to see here')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders action link and button when label and href provided', () => {
    render(
      <EmptyState
        title="No Products"
        description="Create your first product"
        actionLabel="Add Product"
        actionHref="/admin/products/add"
      />
    );
    const btn = screen.getByRole('button', { name: 'Add Product' });
    expect(btn).toBeInTheDocument();
  });
});

