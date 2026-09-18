import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExplainabilityPage } from './ExplainabilityPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    getApplicationDetail: vi.fn(),
  },
}));

describe('ExplainabilityPage', () => {
  const renderWithProviders = (ui: React.ReactElement, initialRoute = '/cases/app-1/explain') => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    window.history.pushState({}, 'Test page', initialRoute);
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/cases/:id/explain" element={ui} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    vi.mocked(api.getApplicationDetail).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<ExplainabilityPage />);
    expect(screen.getByText('AI Explainability')).toBeInTheDocument();
  });

  it('renders score breakdown and checks', async () => {
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
          { id: 'c-2', name: 'EPFO Check', result: 'fail', source: 'EPFO', severity: 'HIGH', evidence: null },
        ],
        score: {
          overall_score: 85,
          risk_level: 'LOW',
          score_breakdown: {
            contributions: { 'c-1': 100, 'c-2': 0 },
            anomaly_penalty: 5,
          },
        },
        recommendation: {
          text: 'AI explanation text',
          suggested_action: 'qualify',
          model_used: 'synthetic',
        },
        decisions: [],
      },
    });

    renderWithProviders(<ExplainabilityPage />);

    expect(await screen.findByText('Test Bidder · Test Tender')).toBeInTheDocument();
    
    // Score
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    
    // Contributions
    expect(screen.getAllByText('GST Check').length).toBeGreaterThan(0);
    expect(screen.getAllByText('100.0%').length).toBeGreaterThan(0);
    expect(screen.getByText(/Anomaly penalty applied: −5 points/)).toBeInTheDocument();

    // Check results
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(2); // 1 pass, 1 fail

    // AI recommendation
    expect(screen.getByText('AI explanation text')).toBeInTheDocument();
  });
});
