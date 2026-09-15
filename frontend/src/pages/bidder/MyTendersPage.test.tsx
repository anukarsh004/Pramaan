import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyTendersPage } from './MyTendersPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    bidder: {
      getMyTenders: vi.fn(),
      getAvailableTenders: vi.fn(),
    },
  },
}));

describe('MyTendersPage', () => {
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
    vi.mocked(api.bidder.getMyTenders).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.bidder.getAvailableTenders).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<MyTendersPage />);
    expect(screen.getByText('My Tender Dashboard')).toBeInTheDocument();
  });

  it('renders tenders when loaded', async () => {
    vi.mocked(api.bidder.getMyTenders).mockResolvedValue({
      success: true,
      data: [
        {
          application_id: 'app-1',
          tender_id: 'tender-1',
          tender_title: 'Test Tender',
          gem_bid_number: 'GEM/2026/B/123',
          closing_date: '2026-10-15T00:00:00Z',
          status: 'intake_pending',
          submitted_at: null,
        },
      ],
    });

    vi.mocked(api.bidder.getAvailableTenders).mockResolvedValue({
      success: true,
      data: [],
    });

    renderWithProviders(<MyTendersPage />);

    expect(await screen.findByText('Test Tender')).toBeInTheDocument();
    expect(screen.getByText('GEM/2026/B/123')).toBeInTheDocument();
  });
});
