import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import Medal from '@/components/atoms/Medal';

describe('Medal atom', () => {
  it('renders correct emoji for ranks', () => {
    const { rerender, container } = render(<Medal rank={1} />);
    expect(container.textContent).toContain('🥇');
    rerender(<Medal rank={2} />);
    expect(container.textContent).toContain('🥈');
    rerender(<Medal rank={3} />);
    expect(container.textContent).toContain('🥉');
  });
});

