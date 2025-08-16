import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/atoms/badge';
import { Button } from '@/components/atoms/button';
import { Input } from '@/components/atoms/input';
import { Label } from '@/components/atoms/label';
import { Textarea } from '@/components/atoms/textarea';
import { Separator } from '@/components/atoms/separator';
import { Checkbox } from '@/components/atoms/checkbox';
import { Switch } from '@/components/atoms/switch';

describe('atoms', () => {
  it('renders Badge variants', () => {
    const { rerender } = render(<Badge>Default</Badge>);
    expect(screen.getByText('Default')).toBeInTheDocument();
    rerender(<Badge variant="secondary">Secondary</Badge>);
    expect(screen.getByText('Secondary')).toBeInTheDocument();
    rerender(<Badge variant="destructive">Danger</Badge>);
    expect(screen.getByText('Danger')).toBeInTheDocument();
    rerender(<Badge variant="outline">Outline</Badge>);
    expect(screen.getByText('Outline')).toBeInTheDocument();
    rerender(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  it('renders Button sizes and variants', () => {
    const { rerender } = render(<Button>Click</Button>);
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
    rerender(<Button variant="secondary">Sec</Button>);
    expect(screen.getByRole('button', { name: 'Sec' })).toBeInTheDocument();
    rerender(<Button variant="destructive">Del</Button>);
    rerender(<Button variant="success">Ok</Button>);
    rerender(<Button variant="outline">Out</Button>);
    rerender(<Button variant="ghost">Ghost</Button>);
    rerender(<Button variant="link">Link</Button>);
    rerender(<Button size="sm">Small</Button>);
    rerender(<Button size="lg">Large</Button>);
    rerender(<Button size="icon" aria-label="icon" />);
    expect(screen.getByRole('button', { name: 'icon' })).toBeInTheDocument();
  });

  it('renders Input, Label, Textarea', () => {
    render(<Label htmlFor="name">Name</Label>);
    expect(screen.getByText('Name')).toBeInTheDocument();
    render(<Input id="name" placeholder="Your name" />);
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
    render(<Textarea placeholder="Say hi" />);
    expect(screen.getByPlaceholderText('Say hi')).toBeInTheDocument();
  });

  it('renders Separator horizontal and vertical', () => {
    const { rerender } = render(<Separator data-testid="sep" />);
    expect(screen.getByTestId('sep')).toBeInTheDocument();
    rerender(<Separator data-testid="sep" orientation="vertical" />);
    expect(screen.getByTestId('sep')).toBeInTheDocument();
  });

  it('renders Checkbox and Switch with defaultChecked', () => {
    render(<Checkbox defaultChecked aria-label="cb" />);
    expect(screen.getByLabelText('cb')).toBeInTheDocument();
    render(<Switch defaultChecked aria-label="sw" />);
    expect(screen.getByLabelText('sw')).toBeInTheDocument();
  });
});
