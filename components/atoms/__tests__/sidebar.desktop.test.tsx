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

  it('supports floating/right variants and controlled open via onOpenChange', () => {
    const onOpenChange = vi.fn();
    render(
      <SidebarProvider open onOpenChange={onOpenChange}>
        <Sidebar variant="floating" side="right" collapsible="icon">
          <SidebarHeader>Head</SidebarHeader>
          <SidebarContent>Content</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>
    );
    const gap = document.querySelector('[data-slot="sidebar-gap"]') as HTMLElement;
    expect(gap.className).toContain('group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]');
    const container = document.querySelector('[data-slot="sidebar-container"]') as HTMLElement;
    expect(container.className).toContain('right-0');
    expect(container.className).toContain('p-2');
    // Toggle should call onOpenChange (controlled branch)
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    expect(onOpenChange).toHaveBeenCalled();
  });
});
