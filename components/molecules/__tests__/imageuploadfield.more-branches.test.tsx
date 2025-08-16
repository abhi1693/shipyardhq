import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, FormProvider } from 'react-hook-form';

// Minimal DeleteButton
vi.mock('@/components/molecules/DeleteButton', () => ({
  __esModule: true,
  default: ({ onClick, label = 'Delete' }: any) => <button onClick={onClick}>{label}</button>,
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch as any);

import ImageUploadField from '@/components/molecules/ImageUploadField';

function Wrapper() {
  const methods = useForm({ defaultValues: { img: '' } } as any);
  return (
    <FormProvider {...(methods as any)}>
      <ImageUploadField name="img" label="Logo" productId="p1" />
    </FormProvider>
  );
}

describe('ImageUploadField more branches', () => {
  it('includes productId in FormData and ignores drop while uploading', async () => {
    let resolver: any;
    mockFetch.mockImplementationOnce(() => new Promise((r) => (resolver = r)));
    const { container } = render(<Wrapper />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const user = userEvent.setup();
    await user.upload(input, file);

    // While uploading, simulate dragover and drop on the label; should not trigger another fetch
    const label = container.querySelector('label[aria-busy="true"]') as HTMLLabelElement;
    const dropEvt = new Event('drop', { bubbles: true, cancelable: true }) as any;
    Object.defineProperty(dropEvt, 'dataTransfer', { value: { files: [new File(['y'], 'b.png', { type: 'image/png' })] } });
    label.dispatchEvent(new Event('dragover', { bubbles: true }));
    label.dispatchEvent(dropEvt);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Resolve first upload and verify FormData contents contained productId
    // The first call had a RequestInit with body as FormData
    const body = (mockFetch as any).mock.calls[0][1].body as FormData;
    expect(body.get('productId')).toBe('p1');
    resolver({ ok: true, json: async () => ({ url: 'u' }) } as any);
    await waitFor(() => expect(container.querySelector('a[href="u"]')).toBeTruthy());
  });
});

