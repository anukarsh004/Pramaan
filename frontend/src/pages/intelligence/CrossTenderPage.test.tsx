import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CrossTenderPage } from './CrossTenderPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    intelligence: {
      getCrossTender: vi.fn(),
    },
  },
}));

describe('CrossTenderPage', () => {
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

  it('renders input state initially', () => {
    vi.mocked(api.intelligence.getCrossTender).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CrossTenderPage />);
    expect(screen.getByText('Cross-Tender Intelligence')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter bidder ID…')).toBeInTheDocument();
  });

  it('renders report when loaded', async () => {
    vi.mocked(api.intelligence.getCrossTender).mockResolvedValue({
      success: true,
      data: {
        bidder_id: 'b-1',
        bidder_name: 'Test Bidder',
        pan_number: 'ABCDE1234F',
        summary: 'Bidder is generally good.',
        stats: {
          total_participations: 5,
          qualified_count: 3,
          disqualified_count: 1,
          pending_count: 1,
          win_rate_pct: 60,
          avg_compliance_score: 80,
          total_flags: 2,
        },
        participations: [
          {
            tender_id: 't-1',
            tender_title: 'Tender 1',
            gem_bid_number: 'GEM/2026/B/111',
            status: 'closed',
            decision: 'qualify',
            compliance_score: 85,
            risk_level: 'LOW',
            closing_date: '2026-10-15',
            bid_amount: 1500000,
            flags: [],
          },
        ],
        score_trend: [
          { tender_title: 'Tender 1', score: 85, date: '2026-10-15', risk_level: 'LOW' },
        ],
        red_flag_timeline: [],
      },
    });

    renderWithProviders(<CrossTenderPage />);

    // Trigger analysis
    const input = screen.getByPlaceholderText('Enter bidder ID…');
    fireEvent.change(input, { target: { value: 'b-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Analyze/i }));

    expect(await screen.findByText('Test Bidder')).toBeInTheDocument();
    expect(screen.getByText('PAN: ABCDE1234F')).toBeInTheDocument();
    
    // Stats
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getAllByText('Tender 1').length).toBeGreaterThan(0);
  });
});
