import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import ShareOnX from '@/components/molecules/ShareOnX';

// Minimal Badge mock to avoid importing full styles
vi.mock('@/components/atoms/badge', () => ({
  Badge: (p: any) => <button {...p} />,
}));

describe('ShareOnX', () => {
  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null as any);
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://example.com' },
      writable: true,
    });
  });

  it('opens twitter intent with absolute URL and text', async () => {
    render(<ShareOnX path="/p/abc" productName="CoolApp" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /share on x/i }));
    expect(window.open).toHaveBeenCalled();
    const urlStr = (window.open as any).mock.calls[0][0] as string;
    expect(urlStr).toContain('https://twitter.com/intent/tweet');
    const u = new URL(urlStr);
    expect(u.searchParams.get('text')).toBe('Check out CoolApp on ShipYardHQ');
    expect(u.searchParams.get('url')).toBe('https://example.com/p/abc');
  });
});
