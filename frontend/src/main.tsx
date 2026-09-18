import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
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
import { ComparisonPage } from './pages/officer/ComparisonPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { NotificationCenter } from './pages/shared/NotificationCenter';
import { LoginPage } from './pages/shared/LoginPage';
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
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<LoginPage />} />

            <Route element={<AppShell />}>

              {/* Dashboard & Notifications (Internal Users) */}
              <Route element={<ProtectedRoute allowedRoles={['OFFICER', 'ADMIN', 'VIGILANCE']} />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/notifications" element={<NotificationCenter />} />
              </Route>

              {/* Case Review (Internal Users) */}
              <Route element={<ProtectedRoute allowedRoles={['OFFICER', 'ADMIN', 'VIGILANCE']} />}>
                <Route path="/cases/:id" element={<CaseDetailPage />} />
                <Route path="/cases/:id/explain" element={<ExplainabilityPage />} />
                <Route path="/comparison" element={<ComparisonPage />} />
              </Route>

              {/* Bidder routes */}
              <Route element={<ProtectedRoute allowedRoles={['BIDDER']} />}>
                <Route path="/my-tenders" element={<MyTendersPage />} />
                <Route path="/upload/:applicationId" element={<UploadPage />} />
                <Route path="/status/:applicationId" element={<StatusPage />} />
              </Route>

              {/* Admin routes */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="/admin" element={<ConsolePage />} />
                <Route path="/admin/rules" element={<RuleConfigPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
              </Route>

              {/* Intelligence - Restricted */}
              <Route element={<ProtectedRoute allowedRoles={['OFFICER', 'ADMIN', 'VIGILANCE']} />}>
                <Route path="/intelligence/bid-rigging" element={<BidRiggingPage />} />
                <Route path="/intelligence/doc-tamper" element={<DocTamperPage />} />
                <Route path="/intelligence/cross-tender" element={<CrossTenderPage />} />
              </Route>

              {/* Intelligence - Shared with Bidder */}
              <Route element={<ProtectedRoute allowedRoles={['OFFICER', 'ADMIN', 'VIGILANCE', 'BIDDER']} />}>
                <Route path="/intelligence/health-check" element={<HealthCheckPage />} />
              </Route>

              {/* Audit */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'VIGILANCE']} />}>
                <Route path="/audit/:applicationId" element={<AuditTrailPage />} />
              </Route>

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
    <ErrorBoundary>
      <Toaster position="top-right" />
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
