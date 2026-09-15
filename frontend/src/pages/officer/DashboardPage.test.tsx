import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    getApplications: vi.fn(),
  },
}));

vi.mock('../../lib/auth', () => ({
  useAuth: vi.fn(() => ({
    user: { full_name: 'Test Officer', role: 'OFFICER' },
    role: 'officer',
  })),
}));

describe('DashboardPage', () => {
  const renderWithProviders = (ui: React.ReactElement) => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{ui}</BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    vi.mocked(api.getApplications).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<DashboardPage />);
    expect(screen.getByText('Welcome back, Test Officer')).toBeInTheDocument();
    expect(screen.getByText('Intelligence Hub')).toBeInTheDocument();
  });

  it('renders applications when loaded', async () => {
    vi.mocked(api.getApplications).mockResolvedValue({
      success: true,
      page: 1,
      limit: 20,
      total: 1,
      data: [
        {
          id: 'app-1',
          bidder_name: 'Test Bidder',
          tender_title: 'Test Tender',
          status: 'ready_for_review',
          overall_score: 85,
          risk_level: 'LOW',
          submitted_at: '2026-10-15T00:00:00Z',
        },
      ],
    });

    renderWithProviders(<DashboardPage />);

    expect(await screen.findByText('Test Bidder')).toBeInTheDocument();
    expect(screen.getByText('Test Tender')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
  });
});
