import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.tsx'],
    globals: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
      // Cover library, hooks, and atoms first (we'll expand to more components iteratively)
      include: [
        'lib/**/*',
        'hooks/**/*',
        'components/atoms/badge.tsx',
        'components/atoms/button.tsx',
        'components/atoms/input.tsx',
        'components/atoms/label.tsx',
        'components/atoms/textarea.tsx',
        'components/atoms/accordion.tsx',
        'components/atoms/tooltip.tsx',
        'components/atoms/avatar.tsx',
        'components/atoms/skeleton.tsx',
        'components/atoms/card.tsx',
        'components/atoms/separator.tsx',
        'components/atoms/checkbox.tsx',
        'components/atoms/switch.tsx',
        'components/molecules/CopyButton.tsx',
        'components/molecules/SignInCtaButton.tsx',
        'components/molecules/ExternalBadgeLink.tsx',
        'components/molecules/MemberAreaButton.tsx',
        'components/molecules/ShareOnXButton.tsx',
      ],
      exclude: [
        'node_modules/**',
        '.next/**',
        'prisma/**',
        'next.config.ts',
        'postcss.config.mjs',
        'tailwind.config.js',
        'eslint.config.mjs',
        '**/*.d.ts',
      ],
    },
  },
});
