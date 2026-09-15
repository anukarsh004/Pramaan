import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RuleConfigPage } from './RuleConfigPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    admin: {
      getCheckTypes: vi.fn(),
      getTenders: vi.fn(),
      createCheckType: vi.fn(),
    },
  },
}));

describe('RuleConfigPage', () => {
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

  it('renders check types and tenders', async () => {
    vi.mocked(api.admin.getCheckTypes).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'ct-1',
          name: 'PAN Verification',
          source_system: 'DOCUMENT',
          mandatory: true,
        },
      ],
    });

    vi.mocked(api.admin.getTenders).mockResolvedValue({
      success: true,
      data: [
        {
          id: 't-1',
          title: 'Test Tender',
          gem_bid_number: 'GEM/2026/B/123',
          rule_set_id: 'rs-1',
        },
      ],
    });

    renderWithProviders(<RuleConfigPage />);

    expect(screen.getByText('Rule Configuration')).toBeInTheDocument();
    
    // Check if data is populated
    expect(await screen.findByText('PAN Verification')).toBeInTheDocument();
    expect(screen.getByText('Test Tender')).toBeInTheDocument();
  });

  it('can open create check type modal', async () => {
    vi.mocked(api.admin.getCheckTypes).mockResolvedValue({ success: true, data: [] });
    vi.mocked(api.admin.getTenders).mockResolvedValue({ success: true, data: [] });

    renderWithProviders(<RuleConfigPage />);

    const addButton = await screen.findByText(/Add Check Type/i);
    fireEvent.click(addButton);

    expect(screen.getByPlaceholderText('PAN Verification')).toBeInTheDocument();
  });
});
