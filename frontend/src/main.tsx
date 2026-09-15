import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/officer/DashboardPage';
import { CaseDetailPage } from './pages/officer/CaseDetailPage';
import { ExplainabilityPage } from './pages/officer/ExplainabilityPage';
import { MyTendersPage } from './pages/bidder/MyTendersPage';
import { UploadPage } from './pages/bidder/UploadPage';
import { StatusPage } from './pages/bidder/StatusPage';
import { ConsolePage } from './pages/admin/ConsolePage';
import { RuleConfigPage } from './pages/admin/RuleConfigPage';
import { AuditTrailPage } from './pages/audit/AuditTrailPage';
import { BidRiggingPage } from './pages/intelligence/BidRiggingPage';
import { DocTamperPage } from './pages/intelligence/DocTamperPage';
import { HealthCheckPage } from './pages/intelligence/HealthCheckPage';
import { CrossTenderPage } from './pages/intelligence/CrossTenderPage';
import { NotFoundPage } from './pages/shared/NotFoundPage';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              {/* Officer routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/cases/:id" element={<CaseDetailPage />} />
              <Route path="/cases/:id/explain" element={<ExplainabilityPage />} />

              {/* Bidder routes */}
              <Route path="/my-tenders" element={<MyTendersPage />} />
              <Route path="/upload/:applicationId" element={<UploadPage />} />
              <Route path="/status/:applicationId" element={<StatusPage />} />

              {/* Admin routes */}
              <Route path="/admin" element={<ConsolePage />} />
              <Route path="/admin/rules" element={<RuleConfigPage />} />

              {/* Intelligence */}
              <Route path="/intelligence/bid-rigging" element={<BidRiggingPage />} />
              <Route path="/intelligence/doc-tamper" element={<DocTamperPage />} />
              <Route path="/intelligence/health-check" element={<HealthCheckPage />} />
              <Route path="/intelligence/cross-tender" element={<CrossTenderPage />} />

              {/* Audit */}
              <Route path="/audit/:applicationId" element={<AuditTrailPage />} />

              {/* Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
