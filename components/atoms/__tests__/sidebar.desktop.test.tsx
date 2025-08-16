import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
} from '@/components/atoms/sidebar';

// Force desktop behavior
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }));

describe('Sidebar desktop', () => {
  it('renders and toggles collapsed state via trigger', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>Head</SidebarHeader>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>
    );

    const wrapper = document.querySelector('[data-slot="sidebar"][data-state]') as HTMLElement;
    expect(wrapper).toBeTruthy();
    const initialState = wrapper.getAttribute('data-state');
    // Click trigger to toggle state
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    const newState = wrapper.getAttribute('data-state');
    expect(newState).not.toBe(initialState);
  });
});
