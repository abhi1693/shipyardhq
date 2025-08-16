import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserAvatarProfile } from '@/components/molecules/UserAvatarProfile';

describe('UserAvatarProfile', () => {
  const baseUser = {
    imageUrl: '/img.png',
    fullName: 'Ada Lovelace',
    emailAddresses: [{ emailAddress: 'ada@example.com' }],
  };

  it('renders avatar with fallback initials and no info by default', () => {
    render(<UserAvatarProfile user={baseUser} />);
    // Fallback shows first two uppercase letters
    expect(screen.getByText('AD')).toBeInTheDocument();
    // Info block hidden by default
    expect(screen.queryByText('ada@example.com')).toBeNull();
  });

  it('shows user name and email when showInfo is true', () => {
    render(<UserAvatarProfile user={baseUser} showInfo />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('handles null user and renders CN fallback', () => {
    render(<UserAvatarProfile user={null} />);
    expect(screen.getByText('CN')).toBeInTheDocument();
  });
});
