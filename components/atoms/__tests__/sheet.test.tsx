import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/atoms/sheet';

describe('Sheet atoms', () => {
  it('renders overlay, content and header when open', () => {
    render(
      <Sheet open>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription>Desc</SheetDescription>
          </SheetHeader>
          <SheetClose>Close</SheetClose>
        </SheetContent>
      </Sheet>
    );
    // Overlay and content rendered via portal
    expect(document.querySelector('[data-slot="sheet-overlay"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="sheet-content"]')).toBeTruthy();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="sheet-close"]')).toBeTruthy();
  });
});




describe('Sheet atoms sides', () => {
  it('applies side classes for top/bottom/default and renders footer', () => {
    const { rerender } = render(
      <Sheet open>
        <SheetContent side="top">
          <SheetHeader>
            <SheetTitle>Top</SheetTitle>
          </SheetHeader>
          <SheetFooter>Ftr</SheetFooter>
        </SheetContent>
      </Sheet>
    );
    const content = document.querySelector('[data-slot="sheet-content"]') as HTMLElement;
    expect(content.className).toContain('slide-in-from-top');
    expect(document.querySelector('[data-slot="sheet-footer"]').textContent).toContain('Ftr');

    rerender(
      <Sheet open>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Bottom</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    const content2 = document.querySelector('[data-slot="sheet-content"]') as HTMLElement;
    expect(content2.className).toContain('slide-in-from-bottom');

    // default side is right
    rerender(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Right</SheetTitle>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
    const content3 = document.querySelector('[data-slot="sheet-content"]') as HTMLElement;
    expect(content3.className).toContain('slide-in-from-right');
  });
});
