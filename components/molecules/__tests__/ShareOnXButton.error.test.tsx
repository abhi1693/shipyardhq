import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ShareOnXButton from '@/components/molecules/ShareOnXButton';

describe('ShareOnXButton error branch', () => {
  it('handles URL construction errors without calling window.open', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null as any);
    const originalLocation = window.location as any;
    // Break URL(base) resolution
    // @ts-expect-error override
    window.location = undefined;
    render(<ShareOnXButton path="/p/abc" productName="Cool" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /share on x/i }));
    expect(openSpy).not.toHaveBeenCalled();
    // restore
    // @ts-expect-error restore
    window.location = originalLocation;
    openSpy.mockRestore();
  });
});
