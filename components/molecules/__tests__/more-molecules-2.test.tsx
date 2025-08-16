import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import CreateButton from '@/components/molecules/CreateButton';
import DeleteButton from '@/components/molecules/DeleteButton';
import ArchiveButton from '@/components/molecules/ArchiveButton';
import UnarchiveButton from '@/components/molecules/UnarchiveButton';
import PublishButton from '@/components/molecules/PublishButton';
import UnpublishButton from '@/components/molecules/UnpublishButton';
import SubmitProductButton from '@/components/molecules/SubmitProductButton';
import CTAFeatureYourProductCard from '@/components/molecules/CTAFeatureYourProductCard';
import UniformCard from '@/components/molecules/UniformCard';
import { StatCard } from '@/components/molecules/StatCard';
import { CategoryCard } from '@/components/molecules/CategoryCard';
import { ProductAuthor } from '@/components/molecules/ProductAuthor';
import { UpvoteSquare } from '@/components/molecules/UpvoteSquare';
import InlineSelect from '@/components/molecules/InlineSelect';
import { VerifyDomainButton } from '@/components/molecules/VerifyDomainButton';

// Mocks
vi.mock('@/actions/admin/products/actions', () => ({
  verifyProductDomainAction: vi.fn(async (_id: string) => ({ success: true })),
}));

describe('additional molecules (set 2)', () => {
  beforeEach(() => {
    // noop
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('basic CTA and icon buttons render default labels', () => {
    render(<CreateButton />);
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    render(<DeleteButton />);
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    render(<ArchiveButton />);
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
    render(<UnarchiveButton />);
    expect(screen.getByRole('button', { name: /unarchive/i })).toBeInTheDocument();
    render(<PublishButton />);
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument();
    render(<UnpublishButton />);
    expect(screen.getByRole('button', { name: /unpublish/i })).toBeInTheDocument();
    render(<SubmitProductButton />);
    expect(screen.getByRole('button', { name: /submit product/i })).toBeInTheDocument();
  });

  it('CTAFeatureYourProductCard renders link and nested button', () => {
    render(<CTAFeatureYourProductCard />);
    expect(screen.getByRole('link', { name: /submit your product/i })).toBeInTheDocument();
  });

  it('UniformCard supports size variants', () => {
    const { rerender } = render(<UniformCard>Child</UniformCard>);
    expect(screen.getByText('Child')).toBeInTheDocument();
    rerender(<UniformCard size="compact">Child</UniformCard>);
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('StatCard renders value, badge, trend, and sparkline path', () => {
    const { container } = render(
      <StatCard
        title="Views"
        value={12345}
        badge="+10%"
        trend="up"
        sparkline={[1, 3, 2, 4, 6, 5]}
      />,
    );
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(container.querySelector('svg path')).toBeTruthy();
    expect(screen.getByText('+10%')).toBeInTheDocument();
  });

  it('CategoryCard renders count pluralization and optional description', () => {
    const { rerender } = render(
      <CategoryCard href="/c" name="AI" icon="robot" count={2} description="desc" />,
    );
    expect(screen.getByText(/2 products/)).toBeInTheDocument();
    expect(screen.getByText('desc')).toBeInTheDocument();
    rerender(<CategoryCard href="/c" name="AI" icon="robot" count={1} />);
    expect(screen.getByText(/1 product$/)).toBeInTheDocument();
  });

  it('ProductAuthor renders avatar initials and title', () => {
    render(<ProductAuthor name="Ada Lovelace" initial="AL" />);
    expect(screen.getByTitle('Ada Lovelace')).toBeInTheDocument();
  });

  it('UpvoteSquare renders count and active/pop styles', () => {
    const { rerender } = render(<UpvoteSquare count={10} />);
    expect(screen.getByLabelText('Upvotes')).toBeInTheDocument();
    rerender(<UpvoteSquare count={11} active pop compact />);
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  it('InlineSelect renders options', () => {
    render(
      <InlineSelect
        value="a"
        onValueChange={() => {}}
        options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]}
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('VerifyDomainButton calls action and handles success/error', async () => {
    const { toast } = await import('sonner');
    vi.spyOn(toast, 'success');
    vi.spyOn(toast, 'error');
    // Patch location.reload to a mock to avoid jsdom navigation error
    const originalLocation = window.location as any;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: vi.fn() },
      writable: true,
    });
    const mod = await import('@/actions/admin/products/actions');
    (mod.verifyProductDomainAction as any).mockResolvedValueOnce({ success: true });
    render(<VerifyDomainButton productId="p1" />);
    await screen.getByRole('button', { name: /verify domain/i }).click();
    await waitFor(() => expect(toast.success).toHaveBeenCalled());

    (mod.verifyProductDomainAction as any).mockResolvedValueOnce({ success: false, error: 'Nope' });
    await screen.getByRole('button', { name: /verify domain/i }).click();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    // Restore location
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });
});
