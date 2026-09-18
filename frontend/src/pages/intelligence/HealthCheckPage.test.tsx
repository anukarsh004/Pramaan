import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HealthCheckPage } from './HealthCheckPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    intelligence: {
      getHealthCheck: vi.fn(),
    },
  },
}));

describe('HealthCheckPage', () => {
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
    vi.mocked(api.intelligence.getHealthCheck).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<HealthCheckPage />);
    expect(screen.getByText('Bid Readiness Check')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter application ID…')).toBeInTheDocument();
  });

  it('renders health check results', async () => {
    vi.mocked(api.intelligence.getHealthCheck).mockResolvedValue({
      success: true,
      data: {
        application_id: 'app-1',
        bidder_name: 'Test Bidder',
        readiness_pct: 85,
        total_items: 5,
        passed_items: 4,
        warning_items: 1,
        missing_items: 0,
        checklist: [
          { name: 'PAN Card', doc_type: 'PAN', status: 'pass', icon: '📝' },
          { name: 'GST Certificate', doc_type: 'GST', status: 'warning', detail: 'Address mismatch', icon: '📄' },
        ],
        warnings: [
          { severity: 'warning', title: 'Address Mismatch', description: 'Address on GST does not match PAN.' },
        ],
        name_consistency: {
          primary_name: 'TEST BIDDER',
          mismatches: [
            { doc_type: 'GST_CERTIFICATE', expected: 'TEST BIDDER', name_found: 'TEST BIDDER LTD' },
          ],
        },
        ready_to_submit: true,
      },
    });

    renderWithProviders(<HealthCheckPage />);

    // Trigger check
    const input = screen.getByPlaceholderText('Enter application ID…');
    fireEvent.change(input, { target: { value: 'app-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Check/i }));

    expect(await screen.findByText('YOUR BID READINESS')).toBeInTheDocument();
    
    // Check scores
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Test Bidder')).toBeInTheDocument();
    expect(screen.getByText('4 passed')).toBeInTheDocument();
    
    // Checklist items
    expect(screen.getByText('PAN Card')).toBeInTheDocument();
    expect(screen.getByText('GST Certificate')).toBeInTheDocument();
    
    // Warnings
    expect(screen.getByText('Address mismatch')).toBeInTheDocument();
    expect(screen.getByText('Address on GST does not match PAN.')).toBeInTheDocument();

    // Name mismatch
    expect(screen.getByText('Name Consistency Issues')).toBeInTheDocument();
    expect(screen.getByText('"TEST BIDDER LTD"')).toBeInTheDocument();

    // Ready status
    expect(screen.getByText('Ready to Submit (with warnings)')).toBeInTheDocument();
  });
});
