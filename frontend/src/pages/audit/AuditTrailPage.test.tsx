import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuditTrailPage } from './AuditTrailPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    getAuditTrail: vi.fn(),
  },
}));

describe('AuditTrailPage', () => {
  const renderWithProviders = (ui: React.ReactElement, initialRoute = '/audit/app-1') => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    window.history.pushState({}, 'Test page', initialRoute);
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/audit/:applicationId" element={ui} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    vi.mocked(api.getAuditTrail).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<AuditTrailPage />);
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('renders events and chain verified status', async () => {
    vi.mocked(api.getAuditTrail).mockResolvedValue({
      success: true,
      data: {
        chain_verified: true,
        events: [
          {
            id: 'ev-1',
            action: 'SUBMIT_APPLICATION',
            actor: 'bidder_123',
            event_at: '2026-10-15T10:00:00Z',
            before_state: null,
            after_state: { status: 'submitted' },
            event_hash: 'abcdef1234567890abcdef',
          },
        ],
      },
    });

    renderWithProviders(<AuditTrailPage />);

    expect(await screen.findByText('Chain Verified')).toBeInTheDocument();
    expect(screen.getByText('SUBMIT_APPLICATION')).toBeInTheDocument();
    expect(screen.getAllByText(/bidder_1/).length).toBeGreaterThan(0);
  });

  it('renders chain broken status', async () => {
    vi.mocked(api.getAuditTrail).mockResolvedValue({
      success: true,
      data: {
        chain_verified: false,
        events: [],
      },
    });

    renderWithProviders(<AuditTrailPage />);

    expect(await screen.findByText('Chain Broken!')).toBeInTheDocument();
  });
});
