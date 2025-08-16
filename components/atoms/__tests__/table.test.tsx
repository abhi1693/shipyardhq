import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption, TableFooter } from '@/components/atoms/table';

describe('Table atoms', () => {
  it('renders table structure and slots', () => {
    const { container } = render(
      <Table className="tbl">
        <TableCaption>Cap</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>H1</TableHead>
            <TableHead>H2</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>C1</TableCell>
            <TableCell>C2</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>F1</TableCell>
            <TableCell>F2</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    );
    expect(screen.getByText('Cap')).toBeInTheDocument();
    expect(screen.getByText('H1')).toBeInTheDocument();
    expect(screen.getByText('C2')).toBeInTheDocument();
    // container has table data-slot
    expect(container.querySelector('[data-slot="table"]')).toBeTruthy();
  });
});

