import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/atoms/accordion';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/atoms/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuPortal } from '@/components/atoms/dropdown-menu';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/atoms/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/atoms/tooltip';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/atoms/avatar';
import { Skeleton } from '@/components/atoms/skeleton';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '@/components/atoms/card';
import { ScrollArea, ScrollBar } from '@/components/atoms/scroll-area';
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/atoms/sheet';

describe('radix-based atoms render', () => {
    it('Accordion renders structure', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger>Trig</AccordionTrigger>
          <AccordionContent>Content</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    expect(screen.getByText('Trig')).toBeInTheDocument();
    expect(document.querySelector('[data-slot=\"accordion-content\"]')).toBeTruthy();
  });

  it('Dialog structure renders', () => {
    render(
      <Dialog open>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Desc</DialogDescription>
          </DialogHeader>
          <DialogFooter>Foot</DialogFooter>
          <DialogClose>Close</DialogClose>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText('Open')).toBeInTheDocument();
    
  });

  it('DropdownMenu structure renders', () => {
    render(
      <DropdownMenu open>
        <DropdownMenuTrigger>Trig</DropdownMenuTrigger>
        <DropdownMenuPortal />
        <DropdownMenuContent>
          <DropdownMenuLabel>Label</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Item</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
    expect(screen.getByText('Trig')).toBeInTheDocument();
    expect(document.querySelector('[data-slot="dropdown-menu-label"]')).toBeTruthy();
  });

  it('Select structure renders', () => {
    render(
      <Select open>
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>
    );
    expect(screen.getByText('Pick')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('Tooltip structure renders', () => {
    render(
      <Tooltip>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent>Tip</TooltipContent>
      </Tooltip>
    );
    expect(screen.getByText('Hover')).toBeInTheDocument();
    // content mounts when opened; trigger presence verified above
  });

  it('Avatar structure renders', () => {
    render(
      <Avatar>
        <AvatarImage src="" alt="img" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('Skeleton renders', () => {
    render(<Skeleton data-testid="sk" />);
    expect(screen.getByTestId('sk')).toBeInTheDocument();
  });

  it('Card renders sections', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Desc</CardDescription>
          <CardAction>Act</CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter>Foot</CardFooter>
      </Card>
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
    expect(screen.getByText('Act')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
    expect(screen.getByText('Foot')).toBeInTheDocument();
  });

  it('ScrollArea renders child', () => {
    render(
      <ScrollArea>
        <div>Child</div>
      </ScrollArea>
    );
    expect(screen.getByText('Child')).toBeInTheDocument();
  });



  it('Sheet structure renders trigger', () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>ShTitle</SheetTitle>
            <SheetDescription>ShDesc</SheetDescription>
          </SheetHeader>
          <SheetFooter>ShFoot</SheetFooter>
        </SheetContent>
      </Sheet>
    );
    expect(screen.getByText('Open')).toBeInTheDocument();
  });
});
