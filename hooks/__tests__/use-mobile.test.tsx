import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

function TestComp() {
  const isMobile = useIsMobile();
  return <div data-testid="val">{String(isMobile)}</div>;
}

describe('useIsMobile', () => {
  beforeEach(() => {
    // Minimal matchMedia mock
    // @ts-ignore
    let handler: any;
    window.matchMedia = (query: string) => ({
      media: query,
      matches: false,
      addEventListener: (_: any, cb: any) => { handler = cb; },
      removeEventListener: () => { handler = undefined; },
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => true,
    });
    window.__mqlHandler = () => handler && handler();
  });

  it('returns true when width < 768', () => {
    // @ts-ignore
    window.innerWidth = 500;
    render(<TestComp />);
    expect(screen.getByTestId('val').textContent).toBe('true');
  });

  it('returns false when width >= 768', () => {
    // @ts-ignore
    window.innerWidth = 1000;
    render(<TestComp />);
    expect(screen.getByTestId('val').textContent).toBe('false');
  });

  it('updates on media change and cleans up', async () => {
    // @ts-ignore
    window.innerWidth = 500;
    const { unmount } = render(<TestComp />);
    // simulate media change
    // @ts-ignore
    window.innerWidth = 900;
    // @ts-ignore
    await act(async () => { await Promise.resolve(window.__mqlHandler()); });
    await waitFor(() => expect(screen.getByTestId('val').textContent).toBe('false'));
    unmount();
  });
});
