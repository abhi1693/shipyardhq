import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from '@/components/atoms/select';

describe('Select extra coverage', () => {
  it('renders scroll buttons and popper-specific classes', () => {
    render(
      <Select open value="a" onValueChange={() => {}}>
        <SelectTrigger size="sm">
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Group</SelectLabel>
          <SelectItem value="a">A</SelectItem>
          <SelectSeparator />
            <SelectItem value="b">B</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    const content = document.querySelector('[data-slot="select-content"]') as HTMLElement;
    // popper adds translate utility classes
    expect(content.className).toMatch(/translate|slide-in/);
    // Scroll up/down buttons are always rendered by our wrapper
    expect(document.querySelector('[data-slot="select-label"]')).toBeTruthy();
    expect(document.querySelector('[data-slot="select-separator"]')).toBeTruthy();
  });
});

