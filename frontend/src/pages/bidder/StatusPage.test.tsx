import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusPage } from './StatusPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    bidder: {
      getApplication: vi.fn(),
    },
  },
}));

describe('StatusPage', () => {
  const renderWithProviders = (ui: React.ReactElement, initialRoute = '/status/app-1') => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    window.history.pushState({}, 'Test page', initialRoute);
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/status/:applicationId" element={ui} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('renders loading state initially', () => {
    vi.mocked(api.bidder.getApplication).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<StatusPage />);
    expect(screen.getByText('Application Status')).toBeInTheDocument();
  });

  it('renders application details and documents', async () => {
    vi.mocked(api.bidder.getApplication).mockResolvedValue({
      success: true,
      data: {
        id: 'app-1',
        tender_title: 'Test Tender',
        status: 'ready_for_review',
        submitted_at: '2026-10-15T00:00:00Z',
        documents: [
          {
            id: 'doc-1',
            doc_type: 'GST_CERTIFICATE',
            version: 1,
            extraction_status: 'completed',
            extraction_confidence: 0.95,
          },
        ],
      },
    });

    renderWithProviders(<StatusPage />);

    expect(await screen.findByText('Test Tender')).toBeInTheDocument();
    
    // Check for progress steps
    expect(screen.getByText('Documents Required')).toBeInTheDocument();
    expect(screen.getByText('Officer Review')).toBeInTheDocument();

    // Check for documents
    expect(screen.getByText('GST CERTIFICATE')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('95% confidence')).toBeInTheDocument();
  });
});
