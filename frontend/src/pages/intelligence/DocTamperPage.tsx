import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  ScanSearch, ShieldAlert, ShieldCheck, FileWarning, AlertTriangle,
  CheckCircle2, XCircle, Clock, Eye, FileText,
} from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
  METADATA: 'bg-blue-100 text-blue-700',
  NAME_MISMATCH: 'bg-red-100 text-red-700',
  DATE_ANOMALY: 'bg-amber-100 text-amber-700',
  FORMAT: 'bg-purple-100 text-purple-700',
  DUPLICATE: 'bg-orange-100 text-orange-700',
};

export function DocTamperPage() {
  const [applicationId, setApplicationId] = useState('demo-app-001');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['doc-tamper', applicationId],
    queryFn: () => api.intelligence.getDocTamper(applicationId),
    retry: false,
  });

  const report = data?.data;

  const ratingIcon = (rating: string) => {
    switch (rating) {
      case 'TRUSTED': return <ShieldCheck size={18} className="text-green-600" />;
      case 'SUSPECT': return <FileWarning size={18} className="text-amber-600" />;
      case 'HIGH_RISK': return <ShieldAlert size={18} className="text-red-600" />;
      default: return <Eye size={18} className="text-gray-400" />;
    }
  };

  const ratingColor = (rating: string) => {
    switch (rating) {
      case 'TRUSTED': return 'border-green-200 bg-green-50/30';
      case 'SUSPECT': return 'border-amber-200 bg-amber-50/30';
      case 'HIGH_RISK': return 'border-red-200 bg-red-50/30';
      default: return 'border-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
          <ScanSearch size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Tamper Analysis</h1>
          <p className="text-gray-500 text-sm">
            Analyze document authenticity and detect tampering signals
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
          <ScanSearch size={16} /> Analyze
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : !report ? (
        <div className="card p-12 text-center">
          <ScanSearch size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Enter an application ID and click Analyze</p>
        </div>
      ) : (
        <>
          {/* Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="stat-card">
              <span className="stat-label">Documents Analyzed</span>
              <span className="stat-value">{report.documents_analyzed}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Overall Risk Score</span>
              <span className={`stat-value ${
                report.overall_score >= 60 ? 'text-red-600' :
                report.overall_score >= 25 ? 'text-amber-600' : 'text-green-600'
              }`}>{report.overall_score}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Overall Risk</span>
              <span className={`badge badge-${report.overall_risk.toLowerCase()} text-sm mt-1`}>
                {report.overall_risk}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Name Mismatches</span>
              <span className="stat-value text-red-600">
                {report.name_comparisons.filter((n: any) => !n.matches_primary).length}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="card p-4 border-purple-200 bg-purple-50/20">
            <div className="flex items-start gap-3">
              <ScanSearch size={18} className="text-purple-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
            </div>
          </div>

          {/* Document Risk Cards */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Per-Document Analysis</h2>
            {report.document_risks.map((doc: any) => (
              <div key={doc.document_id} className={`card p-5 border ${ratingColor(doc.authenticity_rating)}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {ratingIcon(doc.authenticity_rating)}
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {doc.doc_type.replace(/_/g, ' ')}
                      </h3>
                      <span className={`text-xs font-medium ${
                        doc.authenticity_rating === 'TRUSTED' ? 'text-green-600' :
                        doc.authenticity_rating === 'SUSPECT' ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {doc.authenticity_rating}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold font-mono ${
                      doc.tamper_score >= 60 ? 'text-red-600' :
                      doc.tamper_score >= 25 ? 'text-amber-600' : 'text-green-600'
                    }`}>
                      {doc.tamper_score}
                    </span>
                    <p className="text-xs text-gray-400">tamper score</p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      doc.tamper_score >= 60 ? 'bg-gradient-to-r from-red-400 to-red-600' :
                      doc.tamper_score >= 25 ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                      'bg-gradient-to-r from-green-400 to-green-600'
                    }`}
                    style={{ width: `${doc.tamper_score}%` }}
                  />
                </div>

                {/* Flags */}
                {doc.flags.length > 0 ? (
                  <div className="space-y-2">
                    {doc.flags.map((flag: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-white/60 border border-gray-100">
                        {flag.severity === 'HIGH' ? (
                          <XCircle size={14} className="text-red-600 mt-0.5 flex-shrink-0" />
                        ) : flag.severity === 'MEDIUM' ? (
                          <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Clock size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              CATEGORY_COLORS[flag.category] || 'bg-gray-100 text-gray-700'
                            }`}>
                              {flag.category}
                            </span>
                            <span className={`text-[10px] font-semibold ${
                              flag.severity === 'HIGH' ? 'text-red-600' :
                              flag.severity === 'MEDIUM' ? 'text-amber-600' : 'text-blue-600'
                            }`}>
                              {flag.severity}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                            {flag.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 size={14} />
                    <span className="text-sm font-medium">No suspicious flags detected</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Name Comparison Table */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <FileText size={16} className="text-brand-600" />
              <h2 className="text-sm font-semibold text-gray-900">Cross-Document Name Comparison</h2>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Entity Name</th>
                    <th>Match</th>
                  </tr>
                </thead>
                <tbody>
                  {report.name_comparisons.map((comp: any) => (
                    <tr key={comp.doc_type}>
                      <td className="font-medium text-gray-900">
                        {comp.doc_type.replace(/_/g, ' ')}
                      </td>
                      <td className={comp.matches_primary ? 'text-gray-700' : 'text-red-700 font-semibold'}>
                        {comp.value}
                      </td>
                      <td>
                        {comp.matches_primary ? (
                          <CheckCircle2 size={16} className="text-green-600" />
                        ) : (
                          <XCircle size={16} className="text-red-600" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
