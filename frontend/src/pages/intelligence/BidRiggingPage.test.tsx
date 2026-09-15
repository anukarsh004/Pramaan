import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BidRiggingPage } from './BidRiggingPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    intelligence: {
      getBidRigging: vi.fn(),
    },
  },
}));

describe('BidRiggingPage', () => {
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
    vi.mocked(api.intelligence.getBidRigging).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<BidRiggingPage />);
    expect(screen.getByText('Bid-Rigging Detection')).toBeInTheDocument();
  });

  it('renders bid rigging report when loaded', async () => {
    vi.mocked(api.intelligence.getBidRigging).mockResolvedValue({
      success: true,
      data: {
        total_tenders_analyzed: 10,
        total_bidders_analyzed: 50,
        suspect_clusters: [
          {
            cluster_id: 'cluster-1',
            risk_score: 85,
            bidder_names: ['Bidder A', 'Bidder B'],
            signals: ['SHARED_ADDRESS'],
          },
        ],
        relationship_edges: [],
        overall_risk: 'HIGH',
        summary: 'Detected potential bid rigging.',
      },
    });

    renderWithProviders(<BidRiggingPage />);

    expect(await screen.findByText('Detected potential bid rigging.')).toBeInTheDocument();
    expect(screen.getByText('Bidder A')).toBeInTheDocument();
    expect(screen.getByText('Bidder B')).toBeInTheDocument();
  });
});
