import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UploadPage } from './UploadPage';
import { api } from '../../lib/api';

vi.mock('../../lib/api', () => ({
  api: {
    uploadDocument: vi.fn(),
    submitApplication: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ applicationId: 'test-app-id' }),
  };
});

describe('UploadPage', () => {
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

  it('renders upload page correctly', () => {
    renderWithProviders(<UploadPage />);
    expect(screen.getByText('Upload Documents')).toBeInTheDocument();
    expect(screen.getByText('Application: test-app…')).toBeInTheDocument();
  });

  it('can select a file and queue it', async () => {
    renderWithProviders(<UploadPage />);

    // Get the file input
    const fileInput = document.querySelector('#file-input') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    // Mock a file selection
    const file = new File(['hello'], 'hello.pdf', { type: 'application/pdf' });
    
    // Simulate user selecting a file
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Assert that the file is queued
    expect(await screen.findByText('hello.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Queued/i)).toBeInTheDocument();
  });
});
