import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock dropdown primitives to render inline and clickable
vi.mock('@/components/atoms/dropdown-menu', () => ({
  DropdownMenu: ({ children, ...p }: any) => <div data-testid="dm" {...p}>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children, ...p }: any) => <div data-testid="menu" {...p}>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/actions/admin/products/actions', () => ({ setProductStatusAction: vi.fn() }));

import ProductStatusMenu from '@/components/molecules/ProductStatusMenu';
import { toast } from 'sonner';
import * as actions from '@/actions/admin/products/actions';

beforeEach(() => {
  refresh.mockReset();
  (toast.success as any).mockReset();
  (toast.error as any).mockReset();
  (actions.setProductStatusAction as any).mockReset();
});

describe('ProductStatusMenu', () => {
  it('shows Publish/Archive for draft and updates to published', async () => {
    (actions.setProductStatusAction as any).mockResolvedValueOnce({});
    render(<ProductStatusMenu productId="p1" status="draft" />);
    expect(screen.getByRole('button', { name: /set status/i })).toBeInTheDocument();
    // Menu content mounted inline by our mock
    expect(screen.getByText(/Publish/i)).toBeInTheDocument();
    expect(screen.getByText(/Archive/i)).toBeInTheDocument();
    await screen.getByText(/Publish/i).click();
    expect(actions.setProductStatusAction).toHaveBeenCalledWith('p1', 'published');
    expect(toast.success).toHaveBeenCalledWith('Status set to published');
    expect(refresh).toHaveBeenCalled();
  });

  it('shows Unpublish/Archive for published and handles error', async () => {
    (actions.setProductStatusAction as any).mockResolvedValueOnce({ error: 'nope' });
    render(<ProductStatusMenu productId="p2" status="published" />);
    expect(screen.getByText(/Unpublish/i)).toBeInTheDocument();
    await screen.getByText(/Unpublish/i).click();
    expect(actions.setProductStatusAction).toHaveBeenCalledWith('p2', 'draft');
    expect(toast.error).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it('shows Unarchive when archived and hides Archive', () => {
    render(<ProductStatusMenu productId="p3" status="archived" />);
    expect(screen.getByText(/Unarchive/i)).toBeInTheDocument();
    // Ensure Archive button (not Unarchive) absent
    expect(screen.queryByRole('button', { name: /^Archive$/i })).toBeNull();
  });
});

