import '@testing-library/jest-dom';

// Minimal mocks for Next.js modules often imported by components
import { vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => {
    // Render as a regular anchor in tests
    // eslint-disable-next-line jsx-a11y/anchor-is-valid
    return <a href={typeof href === 'string' ? href : '#'} {...props}>{children}</a>;
  },
}));

vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { src, alt, ...rest } = props;
    // Render a basic img for testing
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={typeof src === 'string' ? src : ''} alt={alt} {...rest} />;
  },
}));

