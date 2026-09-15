import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';

// Mock the auth hook
vi.mock('../../lib/auth', () => ({
  useAuth: vi.fn(() => ({
    user: { full_name: 'Test Officer', role: 'OFFICER' },
    role: 'officer',
    switchRole: vi.fn(),
    logout: vi.fn(),
  })),
}));

describe('AppShell Component', () => {
  it('renders the sidebar and header', () => {
    render(
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    );

    // Sidebar text
    expect(screen.getByText('Pramaan')).toBeInTheDocument();
    expect(screen.getByText('Test Officer')).toBeInTheDocument();

    // Check system status in header
    expect(screen.getByText('System Online')).toBeInTheDocument();
  });
});
