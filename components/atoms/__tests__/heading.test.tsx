import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Heading } from '@/components/atoms/heading';

describe('Heading atom', () => {
  it('renders title and description', () => {
    render(<Heading title="Title" description="Desc" />);
    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
  });
});

