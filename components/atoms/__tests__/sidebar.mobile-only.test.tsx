import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarProvider, Sidebar, SidebarTrigger, SidebarContent, SidebarHeader } from '@/components/atoms/sidebar';

// Force mobile behavior
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => true }));

describe('Sidebar mobile only', () => {
  it('renders mobile sheet and opens via trigger', () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarHeader>Head</SidebarHeader>
          <SidebarContent>Mob</SidebarContent>
        </Sidebar>
        <SidebarTrigger />
      </SidebarProvider>
    );
    // Initially closed (no data-mobile container)
    expect(document.querySelector('[data-mobile="true"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /toggle sidebar/i }));
    // After toggle, mobile content appears
    expect(document.querySelector('[data-mobile="true"]')).toBeTruthy();
  });
});

