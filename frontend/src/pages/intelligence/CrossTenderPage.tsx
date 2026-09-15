import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  GitBranch, TrendingUp, TrendingDown, Award, AlertTriangle,
  CheckCircle2, XCircle, Clock, Target, BarChart3, Flag,
} from 'lucide-react';

export function CrossTenderPage() {
  const [bidderId, setBidderId] = useState('default');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cross-tender', bidderId],
    queryFn: () => api.intelligence.getCrossTender(bidderId),
    retry: false,
  });

  const report = data?.data;

  const decisionIcon = (decision: string | null) => {
    switch (decision) {
      case 'qualify': return <CheckCircle2 size={14} className="text-green-600" />;
      case 'disqualify': return <XCircle size={14} className="text-red-600" />;
      case 'request_more_info': return <Clock size={14} className="text-amber-600" />;
      default: return <Clock size={14} className="text-gray-400" />;
    }
  };

  const riskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      case 'MEDIUM': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <GitBranch size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cross-Tender Intelligence</h1>
          <p className="text-gray-500 text-sm">Bidder history timeline and trend analysis</p>
        </div>
      </div>

      {/* Input */}
      <div className="card p-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="input-label">Bidder ID</label>
          <input
            className="input"
            value={bidderId}
            onChange={(e) => setBidderId(e.target.value)}
            placeholder="Enter bidder ID…"
          />
        </div>
        <button onClick={() => refetch()} className="btn-primary">
          <GitBranch size={16} /> Analyze
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-32 w-full rounded-xl" />
          <div className="skeleton h-64 w-full rounded-xl" />
        </div>
      ) : !report ? (
        <div className="card p-12 text-center">
          <GitBranch size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Enter a bidder ID to view history</p>
        </div>
      ) : (
        <>
          {/* Bidder Info */}
          <div className="card p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center">
                <Target size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{report.bidder_name}</h2>
                <p className="text-sm text-gray-500">PAN: {report.pan_number}</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="stat-card !p-3">
              <span className="stat-label !text-[10px]">Participations</span>
              <span className="stat-value !text-xl">{report.stats.total_participations}</span>
            </div>
            <div className="stat-card !p-3">
              <span className="stat-label !text-[10px]">Qualified</span>
              <span className="stat-value !text-xl text-green-600">{report.stats.qualified_count}</span>
            </div>
            <div className="stat-card !p-3">
              <span className="stat-label !text-[10px]">Disqualified</span>
              <span className="stat-value !text-xl text-red-600">{report.stats.disqualified_count}</span>
            </div>
            <div className="stat-card !p-3">
              <span className="stat-label !text-[10px]">Win Rate</span>
              <span className="stat-value !text-xl">{report.stats.win_rate_pct}%</span>
            </div>
            <div className="stat-card !p-3">
              <span className="stat-label !text-[10px]">Avg Score</span>
              <span className="stat-value !text-xl">{report.stats.avg_compliance_score}</span>
            </div>
            <div className="stat-card !p-3">
              <span className="stat-label !text-[10px]">Total Flags</span>
              <span className="stat-value !text-xl text-amber-600">{report.stats.total_flags}</span>
            </div>
          </div>

          {/* Summary */}
          <div className="card p-4 border-blue-200 bg-blue-50/20">
            <div className="flex items-start gap-3">
              <BarChart3 size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timeline */}
            <div className="card lg:col-span-2">
              <div className="card-header flex items-center gap-2">
                <GitBranch size={16} className="text-blue-600" />
                <h2 className="text-sm font-semibold text-gray-900">Participation Timeline</h2>
              </div>
              <div className="card-body">
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                  <div className="space-y-0">
                    {report.participations.map((p: any, i: number) => (
                      <div key={p.tender_id} className="relative pl-12 pb-6">
                        {/* Dot */}
                        <div className={`absolute left-[10px] w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                          p.decision === 'qualify' ? 'bg-green-500' :
                          p.decision === 'disqualify' ? 'bg-red-500' :
                          p.status === 'ready_for_review' ? 'bg-blue-500' : 'bg-amber-500'
                        }`} />

                        <div className="p-4 rounded-xl border border-gray-100 hover:shadow-sm transition-shadow bg-white">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-sm font-semibold text-gray-900">
                                {p.tender_title}
                              </h3>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">
                                {p.gem_bid_number}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-gray-500">{p.closing_date}</span>
                              <div className="mt-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${riskColor(p.risk_level)}`}>
                                  {p.risk_level}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs">
                            {/* Score */}
                            {p.compliance_score !== null && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-400">Score:</span>
                                <span className={`font-bold font-mono ${
                                  p.compliance_score >= 70 ? 'text-green-600' :
                                  p.compliance_score >= 40 ? 'text-amber-600' : 'text-red-600'
                                }`}>
                                  {p.compliance_score}
                                </span>
                              </div>
                            )}

                            {/* Decision */}
                            {p.decision && (
                              <div className="flex items-center gap-1">
                                {decisionIcon(p.decision)}
                                <span className="text-gray-500 capitalize">
                                  {p.decision.replace(/_/g, ' ')}
                                </span>
                              </div>
                            )}

                            {/* Bid amount */}
                            {p.bid_amount && (
                              <div className="text-gray-400">
                                ₹{(p.bid_amount / 100000).toFixed(1)}L
                              </div>
                            )}
                          </div>

                          {/* Flags */}
                          {p.flags && p.flags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {p.flags.map((flag: string, fi: number) => (
                                <span key={fi} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-100 text-red-700">
                                  <Flag size={8} />
                                  {flag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Score Trend + Red Flags */}
            <div className="space-y-6">
              {/* Score Trend */}
              <div className="card">
                <div className="card-header flex items-center gap-2">
                  <TrendingUp size={16} className="text-brand-600" />
                  <h2 className="text-sm font-semibold text-gray-900">Compliance Score Trend</h2>
                </div>
                <div className="card-body">
                  {report.score_trend.map((point: any, i: number) => {
                    const prev = i > 0 ? report.score_trend[i - 1]?.score : null;
                    const delta = prev != null && point.score != null ? point.score - prev : null;
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-14 flex-shrink-0">
                          <span className={`text-lg font-bold font-mono ${
                            point.score >= 70 ? 'text-green-600' :
                            point.score >= 40 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {point.score ?? '—'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-500 truncate">{point.tender_title}</p>
                          <p className="text-[10px] text-gray-400">{point.date}</p>
                        </div>
                        {delta !== null && (
                          <div className={`flex items-center gap-0.5 text-[10px] font-bold ${
                            delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-400'
                          }`}>
                            {delta > 0 ? <TrendingUp size={10} /> : delta < 0 ? <TrendingDown size={10} /> : null}
                            {delta > 0 ? '+' : ''}{delta}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Red Flag Timeline */}
              {report.red_flag_timeline.length > 0 && (
                <div className="card">
                  <div className="card-header flex items-center gap-2">
                    <Flag size={16} className="text-red-600" />
                    <h2 className="text-sm font-semibold text-gray-900">
                      Red Flag History ({report.stats.total_flags})
                    </h2>
                  </div>
                  <div className="card-body space-y-2">
                    {report.red_flag_timeline.map((item: any, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-red-50/50 border border-red-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">{item.date}</span>
                          <span className="text-[10px] text-gray-400 truncate ml-2">
                            {item.tender}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.flags.map((flag: string, fi: number) => (
                            <span key={fi} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-200 text-red-800">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
