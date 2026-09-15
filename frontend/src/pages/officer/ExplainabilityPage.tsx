import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import {
  ArrowLeft, Sparkles, CheckCircle2, XCircle, Clock, Info,
  BarChart3, Scale, AlertTriangle,
} from 'lucide-react';

export function ExplainabilityPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => api.getApplicationDetail(id!),
    enabled: !!id,
    retry: false,
  });

  const detail = data?.data;
  const checks = detail?.checks || [];
  const score = detail?.score;
  const recommendation = detail?.recommendation;

  const passCount = checks.filter((c) => c.result === 'pass').length;
  const failCount = checks.filter((c) => c.result === 'fail').length;
  const pendingCount = checks.filter((c) => c.result === 'pending' || c.result === 'not_evaluated').length;
  const totalChecks = checks.length;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Explainability</h1>
          <p className="text-sm text-gray-500">
            {detail?.bidder_name} · {detail?.tender_title}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="skeleton h-48 w-full rounded-xl" />
          <div className="skeleton h-32 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Score Breakdown */}
          {score && (
            <div className="card">
              <div className="card-header flex items-center gap-2">
                <BarChart3 size={16} className="text-brand-600" />
                <h2 className="text-sm font-semibold text-gray-900">Score Breakdown</h2>
              </div>
              <div className="card-body">
                <div className="flex items-center gap-6 mb-6">
                  <div className="text-center">
                    <span className={`text-4xl font-bold tabular-nums ${
                      score.risk_level === 'LOW' ? 'text-green-600' :
                      score.risk_level === 'MEDIUM' ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {score.overall_score ?? '—'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">Overall Score</p>
                  </div>
                  <div>
                    <span className={`badge badge-${score.risk_level.toLowerCase()} text-sm`}>
                      {score.risk_level} RISK
                    </span>
                  </div>
                </div>

                {/* Visual bar chart of contributions */}
                {Boolean(score.score_breakdown?.contributions) && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Per-Check Contributions
                    </p>
                    {Object.entries(score.score_breakdown.contributions as Record<string, number>).map(
                      ([checkId, contribution]) => {
                        const check = checks.find((c) => c.id === checkId);
                        return (
                          <div key={checkId} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-700 font-medium">
                                {check?.name || checkId.slice(0, 8)}
                              </span>
                              <span className="text-gray-500 font-mono">
                                {contribution.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500"
                                style={{ width: `${Math.min(contribution, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      }
                    )}
                    {typeof score.score_breakdown.anomaly_penalty === 'number' &&
                      score.score_breakdown.anomaly_penalty > 0 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mt-4">
                          <AlertTriangle size={14} className="text-red-600" />
                          <span className="text-sm text-red-700">
                            Anomaly penalty applied: −{score.score_breakdown.anomaly_penalty} points
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Check Results Summary */}
          <div className="card">
            <div className="card-header flex items-center gap-2">
              <Scale size={16} className="text-brand-600" />
              <h2 className="text-sm font-semibold text-gray-900">Check Results Summary</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 rounded-xl bg-green-50">
                  <CheckCircle2 size={20} className="mx-auto text-green-600 mb-1" />
                  <span className="text-2xl font-bold text-green-700">{passCount}</span>
                  <p className="text-xs text-green-600">Passed</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-red-50">
                  <XCircle size={20} className="mx-auto text-red-600 mb-1" />
                  <span className="text-2xl font-bold text-red-700">{failCount}</span>
                  <p className="text-xs text-red-600">Failed</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-amber-50">
                  <Clock size={20} className="mx-auto text-amber-600 mb-1" />
                  <span className="text-2xl font-bold text-amber-700">{pendingCount}</span>
                  <p className="text-xs text-amber-600">Pending</p>
                </div>
              </div>

              {/* Individual checks */}
              <div className="space-y-2">
                {checks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {check.result === 'pass' ? (
                      <CheckCircle2 size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                    ) : check.result === 'fail' ? (
                      <XCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Clock size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{check.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Source: {check.source}
                        {check.severity && ` · Severity: ${check.severity}`}
                      </p>
                      {check.evidence && (
                        <details className="mt-2">
                          <summary className="text-xs text-brand-600 cursor-pointer hover:underline">
                            View evidence
                          </summary>
                          <pre className="mt-1 text-xs text-gray-500 bg-gray-50 p-2 rounded overflow-x-auto font-mono">
                            {JSON.stringify(check.evidence, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Recommendation Explanation */}
          {recommendation && (
            <div className="card border-ai-border">
              <div className="card-header bg-ai-bg/30 flex items-center gap-2">
                <Sparkles size={16} className="text-ai-text" />
                <h2 className="text-sm font-semibold text-ai-text">AI Reasoning</h2>
              </div>
              <div className="card-body">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50/50 border border-amber-100">
                  <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {recommendation.text}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Model:</span>
                      <span className="ai-label">{recommendation.model_used}</span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Suggested action:</span>
                      <span className={`ml-2 chip ${
                        recommendation.suggested_action === 'qualify' ? 'chip-pass' :
                        recommendation.suggested_action === 'disqualify' ? 'chip-fail' : 'chip-pending'
                      }`}>
                        {recommendation.suggested_action.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
