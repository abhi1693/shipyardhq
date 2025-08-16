import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

const push = vi.fn();
let qs = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/member/products',
  useSearchParams: () => new URLSearchParams(qs),
}));

// Mock InlineSelect to expose three triggers
vi.mock('@/components/molecules/InlineSelect', () => ({
  __esModule: true,
  default: ({ onValueChange, placeholder }: any) => (
    <button aria-label={placeholder} onClick={() => onValueChange(
      placeholder === 'Status' ? 'draft' : placeholder === 'Domain' ? '__all__' : 'updated',
    )} />
  ),
}));

import MemberProductFilters from '@/components/molecules/MemberProductFilters';

describe('MemberProductFilters selects', () => {
  it('pushes updates for status/verification/sort and resets page', async () => {
    render(<MemberProductFilters />);
    // Click Status (sets draft)
    await (await screen.findByLabelText('Status')).click();
    expect((push as any).mock.calls.pop()[0] as string).toContain('status=draft');
    // Click Domain (sets __all__ -> clears param)
    await (await screen.findByLabelText('Domain')).click();
    expect((push as any).mock.calls.pop()[0] as string).not.toContain('verification=');
    // Click Sort (sets updated)
    await (await screen.findByLabelText('Sort')).click();
    const url = (push as any).mock.calls.pop()[0] as string;
    expect(url).toContain('sort=updated');
    expect(url).toContain('page=1');
  });
});

