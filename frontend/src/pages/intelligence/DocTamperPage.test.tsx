import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocTamperPage } from './DocTamperPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    intelligence: {
      getDocTamper: vi.fn(),
    },
  },
}));

describe('DocTamperPage', () => {
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

  it('renders loading state initially or no report', () => {
    vi.mocked(api.intelligence.getDocTamper).mockReturnValue(new Promise(() => {}));
    renderWithProviders(<DocTamperPage />);
    expect(screen.getByText('Document Tamper Analysis')).toBeInTheDocument();
  });

  it('renders doc tamper report when loaded', async () => {
    vi.mocked(api.intelligence.getDocTamper).mockResolvedValue({
      success: true,
      data: {
        application_id: 'app-1',
        documents_analyzed: 2,
        overall_score: 40,
        overall_risk: 'MEDIUM',
        summary: 'Detected some anomalies.',
        document_risks: [
          {
            document_id: 'doc-1',
            doc_type: 'PAN_CARD',
            authenticity_rating: 'SUSPECT',
            tamper_score: 55,
            flags: [
              {
                category: 'METADATA',
                severity: 'MEDIUM',
                description: 'Metadata anomaly detected',
                evidence: {},
              },
            ],
          },
        ],
        name_comparisons: [
          {
            doc_type: 'PAN_CARD',
            field_name: 'Name',
            value: 'John Doe',
            matches_primary: true,
          },
        ],
      },
    });

    renderWithProviders(<DocTamperPage />);

    // Mock firing the analyze button since we need to trigger refetch
    // or it fetches on mount for the default ID 'demo-app-001'
    expect(await screen.findByText('Detected some anomalies.')).toBeInTheDocument();
    expect(screen.getAllByText('PAN CARD')[0]).toBeInTheDocument();
    expect(screen.getByText('Metadata anomaly detected')).toBeInTheDocument();
  });
});
