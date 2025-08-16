import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { useSidebar } from '@/components/atoms/sidebar';

function UsesHook() {
  // This should throw when not wrapped in provider
  useSidebar();
  return null;
}

describe('useSidebar hook guard', () => {
  it('throws when used outside provider', () => {
    // Suppress console error output from React for clearer test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<UsesHook />)).toThrowError(/used within a SidebarProvider/);
    spy.mockRestore();
  });
});

