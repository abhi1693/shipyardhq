import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { useProductWizard } from '@/hooks/useProductWizard';

function Wrapper({ validateExternal, onSubmit }: any) {
  const form = useForm({ defaultValues: { name: 'x' } } as any);
  const steps = [
    { id: 1, label: 'One' },
    { id: 2, label: 'Two' },
    { id: 3, label: 'Three' },
  ];
  const stepFields = { 1: ['name'], 2: ['name'], 3: ['name'] } as any;
  const wiz = useProductWizard({ form, steps, stepFields, validateExternal, onSubmit });
  return (
    <div>
      <div data-testid="step">{wiz.step}</div>
      <button onClick={wiz.next}>next</button>
      <button onClick={wiz.back}>back</button>
      <button onClick={() => wiz.submitWithStatus('draft')}>submit-draft</button>
      <button onClick={() => wiz.submitWithStatus('published')}>submit-published</button>
    </div>
  );
}

describe('useProductWizard', () => {
  it('navigates steps with next/back', async () => {
    render(<Wrapper validateExternal={() => Promise.resolve(true)} onSubmit={vi.fn()} />);
    const user = userEvent.setup();
    expect(screen.getByTestId('step').textContent).toBe('1');
    await user.click(screen.getByText('next'));
    await waitFor(() => expect(screen.getByTestId('step').textContent).toBe('2'));
    await user.click(screen.getByText('back'));
    await waitFor(() => expect(screen.getByTestId('step').textContent).toBe('1'));
  });

  it('submits with status=draft', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<Wrapper validateExternal={() => Promise.resolve(true)} onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('submit-draft'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].status).toBe('draft');
  });

  it('requires validateExternal for published', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<Wrapper validateExternal={() => Promise.resolve(false)} onSubmit={onSubmit} />);
    const user = userEvent.setup();
    await user.click(screen.getByText('submit-published'));
    // Should not submit; should navigate to last step (3)
    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('step').textContent).toBe('3'));
  });

  it('resets to step 1 on invalid submit', async () => {
    function InvalidWrapper() {
      const fakeForm: any = {
        trigger: vi.fn(async () => false),
        setValue: vi.fn(),
        handleSubmit: (fn: any) => () => fn({}),
      };
      const steps = [
        { id: 1, label: 'One' },
        { id: 2, label: 'Two' },
      ];
      const stepFields = { 1: ['x'], 2: ['y'] } as any;
      const wiz = useProductWizard({
        form: fakeForm,
        steps,
        stepFields,
        validateExternal: () => Promise.resolve(true),
        onSubmit: async () => {},
      });
      return (
        <div>
          <div data-testid="step">{wiz.step}</div>
          <button onClick={() => wiz.setStep(2)}>goto2</button>
          <button onClick={() => wiz.submitWithStatus('draft')}>submit</button>
        </div>
      );
    }

    render(<InvalidWrapper />);
    const user = userEvent.setup();
    // Go to step 2
    await user.click(screen.getByText('goto2'));
    expect(screen.getByTestId('step').textContent).toBe('2');
    // Submitting invalid should reset to 1
    await user.click(screen.getByText('submit'));
    expect(screen.getByTestId('step').textContent).toBe('1');
  });
});
