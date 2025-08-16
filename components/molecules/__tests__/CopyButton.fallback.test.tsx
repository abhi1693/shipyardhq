import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import CopyButton from '@/components/molecules/CopyButton';

// Mock toast from sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CopyButton fallback paths', () => {
  const originalNavigator = global.navigator;
  const originalExec = (document as any).execCommand;
  const originalLocation = window.location;

  beforeEach(() => {
    // Ensure no modern clipboard API so we hit fallback path
    // @ts-expect-error test override
    global.navigator = { ...originalNavigator, clipboard: undefined } as any;
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
    });
  });

  afterEach(() => {
    // Restore globals
    // @ts-expect-error test restore
    global.navigator = originalNavigator as any;
    (document as any).execCommand = originalExec;
    // @ts-expect-error test restore
    window.location = originalLocation;
    vi.restoreAllMocks();
  });

  it('uses fallback execCommand to copy successfully', async () => {
    (document as any).execCommand = vi.fn().mockReturnValue(true);

    render(<CopyButton text="/p/xyz" resolveAbsolute label="Copy" />);
    await screen.getByRole('button', { name: 'Copy' }).click();

    // Button label flips to Copied when successful
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('shows error when fallback copy fails', async () => {
    const { toast } = await import('sonner');
    (toast.success as any).mockClear();
    (toast.error as any).mockClear();

    (document as any).execCommand = vi.fn().mockReturnValue(false);

    render(<CopyButton text="/p/fail" resolveAbsolute label="Copy" />);
    await screen.getByRole('button', { name: 'Copy' }).click();

    // Should not switch to Copied, and should emit error toast
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
    expect((toast.error as any).mock.calls.length).toBeGreaterThan(0);
    expect((toast.success as any).mock.calls.length).toBe(0);
  });

  it('returns original text when resolveAbsolute is false', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // @ts-expect-error override
    global.navigator = { ...originalNavigator, clipboard: { writeText } } as any;

    render(<CopyButton text="/p/noabs" label="Copy" />);
    await screen.getByRole('button', { name: 'Copy' }).click();

    expect(writeText).toHaveBeenCalledWith('/p/noabs');
  });

  it('falls back to text when computing absolute URL throws', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // @ts-expect-error override
    global.navigator = { ...originalNavigator, clipboard: { writeText } } as any;
    // Force an error when accessing location.origin
    // @ts-expect-error test override
    window.location = undefined;

    render(<CopyButton text="/p/crash" resolveAbsolute label="Copy" />);
    await screen.getByRole('button', { name: 'Copy' }).click();

    expect(writeText).toHaveBeenCalledWith('/p/crash');
  });

  it('handles exceptions in fallback copy and shows error', async () => {
    const { toast } = await import('sonner');
    (toast.success as any).mockClear();
    (toast.error as any).mockClear();

    // Ensure fallback path
    // @ts-expect-error test override
    global.navigator = { ...originalNavigator, clipboard: undefined } as any;
    (document as any).execCommand = vi.fn().mockImplementation(() => {
      throw new Error('copy failed');
    });

    render(<CopyButton text="/p/throw" resolveAbsolute label="Copy" />);
    await screen.getByRole('button', { name: 'Copy' }).click();

    expect((toast.error as any).mock.calls.length).toBeGreaterThan(0);
  });
});
