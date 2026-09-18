import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CaseDetailPage } from './CaseDetailPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    getApplicationDetail: vi.fn(),
    recordDecision: vi.fn(),
    reopenCase: vi.fn(),
    triggerProcessing: vi.fn(),
  },
}));

vi.mock('../../lib/auth', () => ({
  useAuth: vi.fn(() => ({
    user: { full_name: 'Test Officer', role: 'OFFICER' },
    role: 'officer',
  })),
}));

describe('CaseDetailPage', () => {
  const renderWithProviders = (ui: React.ReactElement, initialRoute = '/cases/app-1') => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    window.history.pushState({}, 'Test page', initialRoute);
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/cases/:id" element={ui} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    vi.mocked(api.getApplicationDetail).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CaseDetailPage />);
    // The loading state has skeletons, hard to query by text, but we can verify API was called
    expect(api.getApplicationDetail).toHaveBeenCalledWith('app-1');
  });

  it('renders case details when loaded', async () => {
    vi.mocked(api.getApplicationDetail).mockResolvedValue({
      success: true,
      data: {
        id: 'app-1',
        bidder_name: 'Test Bidder',
        tender_title: 'Test Tender',
        status: 'ready_for_review',
        documents: [],
        checks: [
          { id: 'c-1', name: 'GST Check', result: 'pass', source: 'GSTIN', severity: null, evidence: null },
        ],
        score: {
          overall_score: 85,
          risk_level: 'LOW',
          score_breakdown: {},
        },
        recommendation: {
          text: 'Bidder looks good.',
          suggested_action: 'qualify',
          model_used: 'synthetic',
        },
        decisions: [],
      },
    });

    renderWithProviders(<CaseDetailPage />);

    expect(await screen.findByText('Test Bidder')).toBeInTheDocument();
    expect(screen.getByText('Test Tender')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    expect(screen.getByText('GST Check')).toBeInTheDocument();
  });

  it('can open record decision modal', async () => {
    vi.mocked(api.getApplicationDetail).mockResolvedValue({
      success: true,
      data: {
        id: 'app-1',
        bidder_name: 'Test Bidder',
        tender_title: 'Test Tender',
        status: 'ready_for_review',
        documents: [],
        checks: [],
      },
    });

    renderWithProviders(<CaseDetailPage />);

    const recordButton = await screen.findByRole('button', { name: /Record Decision/i });
    fireEvent.click(recordButton);

    expect(screen.getByText('Submit Decision')).toBeInTheDocument();
  });
});
