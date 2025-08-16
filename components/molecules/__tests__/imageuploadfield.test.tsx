import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

// Mock DeleteButton to a simple button to avoid extra logic
vi.mock('@/components/molecules/DeleteButton', () => ({
  __esModule: true,
  default: ({ onClick, label = 'Delete' }: any) => <button onClick={onClick}>{label}</button>,
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch as any);

import ImageUploadField from '@/components/molecules/ImageUploadField';

function Wrapper({ initial = '' }: { initial?: string }) {
  const methods = useForm({ defaultValues: { img: initial } } as any);
  return (
    <FormProvider {...(methods as any)}>
      <ImageUploadField name="img" label="Logo" productId="p1" />
    </FormProvider>
  );
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('ImageUploadField', () => {
  it('uploads a file successfully and shows preview with open link', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://cdn.example.com/x.png' }) } as any);
    render(<Wrapper />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = new File(['data'], 'x.png', { type: 'image/png' });
    const user = userEvent.setup();
    await user.upload(input, file);

    await waitFor(() => expect(screen.getByRole('link', { name: 'Open' })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', 'https://cdn.example.com/x.png');
  });

  it('handles upload error and delete to clear value', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => 'bad' } as any);
    render(<Wrapper />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['data'], 'x.png', { type: 'image/png' });
    const user = userEvent.setup();
    await user.upload(input, file);
    await waitFor(() => expect(screen.getByText(/bad/)).toBeInTheDocument());

    // Re-render with an initial value and verify delete clears
    const { rerender } = render(<Wrapper initial={'https://cdn.example.com/y.png'} />);
    await waitFor(() => expect(screen.getByRole('link', { name: 'Open' })).toBeInTheDocument());
    screen.getByRole('button', { name: /remove/i }).click();
    // After clearing, the label placeholder reappears
    expect(screen.getByText(/Select an image or drag/i)).toBeInTheDocument();
  });
});

