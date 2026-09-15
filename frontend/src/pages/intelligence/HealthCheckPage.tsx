import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  HeartPulse, CheckCircle2, AlertTriangle, XCircle, Upload,
  RefreshCw, Shield, FileCheck,
} from 'lucide-react';

export function HealthCheckPage() {
  const [applicationId, setApplicationId] = useState('demo-app-001');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['health-check', applicationId],
    queryFn: () => api.intelligence.getHealthCheck(applicationId),
    retry: false,
  });

  const result = data?.data;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle2 size={20} className="text-green-600" />;
      case 'warning': return <AlertTriangle size={20} className="text-amber-500" />;
      case 'missing': return <XCircle size={20} className="text-red-500" />;
      default: return null;
    }
  };

  const progressColor = (pct: number) => {
    if (pct >= 80) return 'from-green-400 to-emerald-600';
    if (pct >= 50) return 'from-amber-400 to-orange-500';
    return 'from-red-400 to-rose-600';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
          <HeartPulse size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bid Readiness Check</h1>
          <p className="text-gray-500 text-sm">
            Pre-submission health check for bid compliance
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="card p-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="input-label">Application ID</label>
          <input
            className="input"
            value={applicationId}
            onChange={(e) => setApplicationId(e.target.value)}
            placeholder="Enter application ID…"
          />
        </div>
        <button onClick={() => refetch()} className="btn-primary">
          <RefreshCw size={16} /> Check
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-48 w-full rounded-xl" />
          <div className="skeleton h-32 w-full rounded-xl" />
        </div>
      ) : !result ? (
        <div className="card p-12 text-center">
          <HeartPulse size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Enter an application ID and click Check</p>
        </div>
      ) : (
        <>
          {/* Giant Progress Card */}
          <div className="card p-8">
            <div className="text-center mb-6">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                YOUR BID READINESS
              </p>
              <div className="relative w-full max-w-md mx-auto">
                {/* Progress bar */}
                <div className="w-full h-8 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${progressColor(result.readiness_pct)} transition-all duration-1000 ease-out flex items-center justify-end pr-2`}
                    style={{ width: `${result.readiness_pct}%` }}
                  >
                    {result.readiness_pct >= 20 && (
                      <span className="text-white text-xs font-bold">{result.readiness_pct}%</span>
                    )}
                  </div>
                </div>
                {result.readiness_pct < 20 && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    {result.readiness_pct}%
                  </span>
                )}
              </div>
            </div>

            {/* Bidder name */}
            <div className="text-center">
              <h2 className="text-lg font-bold text-gray-900">{result.bidder_name}</h2>
              <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-500">
                <span className="text-green-600 font-semibold">{result.passed_items} passed</span>
                <span className="text-amber-600 font-semibold">{result.warning_items} warnings</span>
                <span className="text-red-600 font-semibold">{result.missing_items} missing</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Checklist */}
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <FileCheck size={16} className="text-brand-600" />
                <h2 className="text-sm font-semibold text-gray-900">Document Checklist</h2>
              </div>
              <div className="card-body space-y-1">
                {result.checklist.map((item: any, i: number) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      item.status === 'pass' ? 'hover:bg-green-50' :
                      item.status === 'warning' ? 'bg-amber-50/50 hover:bg-amber-50' :
                      'bg-red-50/50 hover:bg-red-50'
                    }`}
                  >
                    {statusIcon(item.status)}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        item.status === 'missing' ? 'text-red-700' : 'text-gray-900'
                      }`}>
                        {item.name}
                      </p>
                      {item.detail && (
                        <p className={`text-xs mt-0.5 ${
                          item.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {item.detail}
                        </p>
                      )}
                    </div>
                    <span className="text-lg">{item.icon}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings & Actions */}
            <div className="space-y-4">
              {result.warnings.length > 0 && (
                <div className="card">
                  <div className="card-header flex items-center gap-2">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <h2 className="text-sm font-semibold text-gray-900">
                      Issues & Recommendations ({result.warnings.length})
                    </h2>
                  </div>
                  <div className="card-body space-y-3">
                    {result.warnings.map((w: any, i: number) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border ${
                          w.severity === 'error'
                            ? 'border-red-200 bg-red-50/50'
                            : 'border-amber-200 bg-amber-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {w.severity === 'error' ? (
                            <XCircle size={14} className="text-red-600" />
                          ) : (
                            <AlertTriangle size={14} className="text-amber-600" />
                          )}
                          <span className={`text-sm font-semibold ${
                            w.severity === 'error' ? 'text-red-800' : 'text-amber-800'
                          }`}>
                            {w.title}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 ml-6 leading-relaxed">
                          {w.description}
                        </p>
                        {w.action && (
                          <div className="ml-6 mt-2">
                            <button className="btn-secondary btn-sm !text-[10px]">
                              <Upload size={10} /> {w.action}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Name Consistency */}
              {Boolean((result.name_consistency as any)?.mismatches?.length) && (
                <div className="card border-amber-200">
                  <div className="card-header bg-amber-50/30 flex items-center gap-2">
                    <Shield size={16} className="text-amber-600" />
                    <h2 className="text-sm font-semibold text-amber-800">Name Consistency Issues</h2>
                  </div>
                  <div className="card-body">
                    <p className="text-xs text-gray-500 mb-3">
                      Primary name (PAN): <strong>{String((result.name_consistency as any)?.primary_name || '')}</strong>
                    </p>
                    {((result.name_consistency as any)?.mismatches || []).map((m: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 mb-2">
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold">{m.doc_type?.replace(/_/g, ' ')}:</span>{' '}
                          <span className="text-red-700 font-medium">"{m.name_found}"</span>
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Expected: "{m.expected}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ready state */}
              <div className={`card p-5 border-2 ${
                result.ready_to_submit
                  ? 'border-green-300 bg-green-50/30'
                  : 'border-red-200 bg-red-50/20'
              }`}>
                <div className="flex items-center gap-3">
                  {result.ready_to_submit ? (
                    <CheckCircle2 size={24} className="text-green-600" />
                  ) : (
                    <XCircle size={24} className="text-red-500" />
                  )}
                  <div>
                    <p className={`text-sm font-bold ${
                      result.ready_to_submit ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.ready_to_submit
                        ? 'Ready to Submit (with warnings)'
                        : 'Not Ready — Missing Documents'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {result.ready_to_submit
                        ? 'All required documents are uploaded. Review warnings before submission.'
                        : 'Upload all required documents before submitting your bid.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
