import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import {
  ClipboardList, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  ArrowRight, Shield, Network, ScanSearch, HeartPulse, GitBranch,
} from 'lucide-react';

export function DashboardPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [page, setPage] = React.useState(1);
  const limit = 20;

  const { data: apps, isLoading } = useQuery({
    queryKey: ['applications', role, page],
    queryFn: () => api.getApplications({ page }),
    retry: false,
  });

  const applications = apps?.data || [];
  const total = apps?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const pendingReview = applications.filter((a) => a.status === 'ready_for_review').length;
  const highRisk = applications.filter((a) => a.risk_level === 'HIGH').length;
  const closed = applications.filter((a) => a.status === 'closed').length;

  const displayApplications = React.useMemo(() => {
    if (role === 'vigilance') return applications.filter(a => a.risk_level === 'HIGH' || a.risk_level === 'MEDIUM');
    if (role === 'officer') return applications.filter(a => a.status !== 'closed');
    return applications; // admin sees all
  }, [applications, role]);

  const stats = [
    { label: 'Total Applications', value: total, icon: <ClipboardList size={20} />, color: 'text-brand-700', bg: 'bg-brand-50' },
    { label: 'Pending Review', value: pendingReview, icon: <Clock size={20} />, color: 'text-amber-700', bg: 'bg-amber-50' },
    { label: 'High Risk', value: highRisk, icon: <AlertTriangle size={20} />, color: 'text-red-700', bg: 'bg-red-50' },
    { label: 'Closed', value: closed, icon: <CheckCircle2 size={20} />, color: 'text-green-700', bg: 'bg-green-50' },
  ];

  const intelligenceCards = [
    { to: '/intelligence/bid-rigging', label: 'Bid-Rigging Detection', desc: 'Cross-tender suspicious relationship analysis', icon: <Network size={24} />, gradient: 'from-rose-500 to-orange-500' },
    { to: '/intelligence/doc-tamper', label: 'Document Tamper', desc: 'Analyze document authenticity & tampering risks', icon: <ScanSearch size={24} />, gradient: 'from-purple-500 to-indigo-500' },
    { to: '/intelligence/health-check', label: 'Health Check', desc: 'Bidder pre-submission readiness verification', icon: <HeartPulse size={24} />, gradient: 'from-emerald-500 to-teal-500' },
    { to: '/intelligence/cross-tender', label: 'Cross-Tender Intel', desc: 'Bidder history timeline & trend analysis', icon: <GitBranch size={24} />, gradient: 'from-blue-500 to-cyan-500' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name || 'User'}
        </h1>
        <p className="text-gray-500 mt-1">
          {role === 'admin' ? 'System overview and configuration.' :
           role === 'vigilance' ? 'Investigate anomalies and high-risk flags.' :
           'Review pending applications and verify compliance.'}
        </p>
      </div>

      {/* Role-Specific Banners */}
      {role === 'admin' && (
         <div className="p-4 bg-brand-50 rounded-lg border border-brand-200 flex sm:flex-row flex-col sm:justify-between sm:items-center gap-4 animate-slide-up">
            <div>
              <h3 className="font-bold text-brand-900">System Admin Controls</h3>
              <p className="text-sm text-brand-700">Manage compliance risk thresholds and system rules.</p>
            </div>
            <button onClick={() => navigate('/admin/rules')} className="btn-primary flex-shrink-0">Configure Rules</button>
         </div>
      )}

      {role === 'vigilance' && (
         <div className="p-4 bg-red-50 rounded-lg border border-red-200 flex sm:flex-row flex-col sm:justify-between sm:items-center gap-4 animate-slide-up">
            <div>
              <h3 className="font-bold text-red-900">Active Investigations</h3>
              <p className="text-sm text-red-700">You have {highRisk} high-risk applications requiring immediate attention.</p>
            </div>
            <button onClick={() => navigate('/intelligence/bid-rigging')} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium flex-shrink-0">View Network Analysis</button>
         </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <span className={stat.color}>{stat.icon}</span>
              </div>
              <TrendingUp size={14} className="text-gray-300" />
            </div>
            <span className="stat-value">
              {isLoading ? <span className="skeleton w-12 h-7 block" /> : stat.value}
            </span>
            <span className="stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Intelligence Hub */}
      {role !== 'bidder' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} className="text-brand-700" />
            <h2 className="text-lg font-semibold text-gray-900">Intelligence Hub</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {intelligenceCards.map((card) => (
              <button
                key={card.to}
                onClick={() => navigate(card.to)}
                className="card p-5 text-left group hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                  <span className="text-white">{card.icon}</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{card.label}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{card.desc}</p>
                <div className="flex items-center gap-1 mt-3 text-brand-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ArrowRight size={12} />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Applications */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {role === 'vigilance' ? 'High-Risk Applications' : role === 'admin' ? 'All Applications (System View)' : 'Applications Queue'}
          </h2>
          <span className="text-xs text-gray-400">{displayApplications.length} visible</span>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bidder</th>
                <th>Tender</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Score</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><span className="skeleton w-20 h-4 block" /></td>
                    ))}
                  </tr>
                ))
              ) : displayApplications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-12">
                    {role === 'vigilance' ? 'No high-risk applications found.' : 'No applications found in queue.'}
                  </td>
                </tr>
              ) : (
                displayApplications.map((app) => (
                  <tr key={app.id} onClick={() => navigate(`/cases/${app.id}`)}>
                    <td className="font-medium text-gray-900">{app.bidder_name}</td>
                    <td className="text-gray-600 max-w-[200px] truncate">{app.tender_title}</td>
                    <td>
                      <span className={`chip chip-${app.status === 'ready_for_review' ? 'pending' : app.status === 'closed' ? 'pass' : 'pending'}`}>
                        {app.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${app.risk_level.toLowerCase()}`}>
                        {app.risk_level}
                      </span>
                    </td>
                    <td>
                      <span className={`font-mono font-bold ${
                        app.overall_score === null ? 'text-gray-400' :
                        app.overall_score >= 70 ? 'text-green-600' :
                        app.overall_score >= 40 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {app.overall_score ?? '—'}
                      </span>
                    </td>
                    <td className="text-gray-500 text-xs">
                      {app.submitted_at
                        ? new Date(app.submitted_at).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary btn-sm"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary btn-sm"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
