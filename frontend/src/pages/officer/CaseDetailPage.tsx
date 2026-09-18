import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import {
  ArrowLeft, FileText, CheckCircle2, XCircle, AlertTriangle, Clock,
  Sparkles, Gavel, RotateCcw, MessageSquare, Eye,
} from 'lucide-react';

export function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [decisionValue, setDecisionValue] = useState<'qualify' | 'disqualify' | 'request_more_info'>('qualify');
  const [remarks, setRemarks] = useState('');
  const [reopenRemarks, setReopenRemarks] = useState('');
  const [showReopen, setShowReopen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['case', id],
    queryFn: () => api.getApplicationDetail(id!),
    enabled: !!id,
    retry: false,
  });

  const decideMutation = useMutation({
    mutationFn: () =>
      api.recordDecision(id!, { decision_value: decisionValue, remarks }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      setShowDecisionForm(false);
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => api.reopenCase(id!, reopenRemarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      setShowReopen(false);
    },
  });

  const processMutation = useMutation({
    mutationFn: () => api.triggerProcessing(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case', id] }),
  });

  const detail = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-48 w-full rounded-xl" />
        <div className="skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="text-center py-20">
        <XCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Case Not Found</h2>
        <p className="text-gray-500 mb-6">This application could not be loaded.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const checkIcon = (result: string) => {
    switch (result) {
      case 'pass': return <CheckCircle2 size={16} className="text-green-600" />;
      case 'fail': return <XCircle size={16} className="text-red-600" />;
      case 'pending': return <Clock size={16} className="text-amber-600" />;
      default: return <AlertTriangle size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="btn-ghost btn-sm">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{detail.bidder_name}</h1>
          <p className="text-sm text-gray-500">{detail.tender_title}</p>
        </div>
        <span className={`chip chip-${detail.status === 'ready_for_review' ? 'pending' : detail.status === 'closed' ? 'pass' : 'pending'}`}>
          {detail.status.replace(/_/g, ' ')}
        </span>
      </div>

      {/* Actions */}
      {role === 'officer' && (
        <div className="flex flex-wrap gap-2">
          {detail.status === 'intake_complete' && (
            <button onClick={() => processMutation.mutate()} className="btn-primary btn-sm" disabled={processMutation.isPending}>
              {processMutation.isPending ? 'Processing…' : '▶ Run Compliance Pipeline'}
            </button>
          )}
          {detail.status === 'ready_for_review' && (
            <button onClick={() => setShowDecisionForm(true)} className="btn-primary btn-sm">
              <Gavel size={14} /> Record Decision
            </button>
          )}
          {detail.status === 'closed' && (
            <button onClick={() => setShowReopen(true)} className="btn-secondary btn-sm">
              <RotateCcw size={14} /> Reopen
            </button>
          )}
          <Link to={`/cases/${id}/explain`} className="btn-ghost btn-sm">
            <Eye size={14} /> Explain AI
          </Link>
          <Link to={`/audit/${id}`} className="btn-ghost btn-sm">
            <FileText size={14} /> Audit Trail
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Documents */}
        <div className="card lg:col-span-1">
          <div className="card-header">
            <h2 className="text-sm font-semibold text-gray-900">Documents ({detail.documents.length})</h2>
          </div>
          <div className="card-body space-y-2">
            {detail.documents.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No documents uploaded</p>
            ) : (
              detail.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <FileText size={16} className="text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.doc_type}</p>
                    <p className="text-xs text-gray-400">v{doc.version}</p>
                  </div>
                  <span className={`chip chip-${doc.extraction_status === 'completed' ? 'pass' : 'pending'} !text-[10px]`}>
                    {doc.extraction_status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Checks + Score */}
        <div className="space-y-6 lg:col-span-2">
          {/* Score */}
          {detail.score && (
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-6">
                  <div className="score-display">
                    <span className={`score-number score-number-${detail.score.risk_level.toLowerCase()}`}>
                      {detail.score.overall_score ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className={`badge badge-${detail.score.risk_level.toLowerCase()}`}>
                      {detail.score.risk_level} RISK
                    </span>
                    <p className="text-xs text-gray-500 mt-1">Compliance Score</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Checks */}
          {detail.checks && detail.checks.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-sm font-semibold text-gray-900">Compliance Checks</h2>
              </div>
              <div className="card-body space-y-2">
                {detail.checks.map((check) => (
                  <div key={check.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100">
                    {checkIcon(check.result)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{check.name}</p>
                      <p className="text-xs text-gray-400">
                        {check.source} {check.severity && `· ${check.severity}`}
                      </p>
                    </div>
                    <span className={`chip chip-${check.result}`}>{check.result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommendation */}
          {detail.recommendation && (
            <div className="card border-ai-border">
              <div className="card-header bg-ai-bg/30">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-ai-text" />
                  <h2 className="text-sm font-semibold text-ai-text">AI Recommendation</h2>
                  <span className="ai-label">{detail.recommendation.model_used}</span>
                </div>
              </div>
              <div className="card-body">
                <p className="text-sm text-gray-700 leading-relaxed">{detail.recommendation.text}</p>
                <div className="mt-3">
                  <span className={`chip ${
                    detail.recommendation.suggested_action === 'qualify' ? 'chip-pass' :
                    detail.recommendation.suggested_action === 'disqualify' ? 'chip-fail' : 'chip-pending'
                  }`}>
                    Suggested: {detail.recommendation.suggested_action.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Decisions */}
          {detail.decisions && detail.decisions.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-sm font-semibold text-gray-900">Decisions</h2>
              </div>
              <div className="card-body space-y-3">
                {detail.decisions.map((d) => (
                  <div key={d.id} className="p-3 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Gavel size={14} className="text-gray-400" />
                      <span className={`chip ${
                        d.decision_value === 'qualify' ? 'chip-pass' :
                        d.decision_value === 'disqualify' ? 'chip-fail' : 'chip-pending'
                      }`}>
                        {d.decision_value.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(d.decided_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{d.remarks}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      {showDecisionForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-modal p-6 w-full max-w-md animate-slide-up">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Record Decision</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="decisionValue" className="input-label">Decision</label>
                <select
                  id="decisionValue"
                  value={decisionValue}
                  onChange={(e) => setDecisionValue(e.target.value as typeof decisionValue)}
                  className="input"
                >
                  <option value="qualify">Qualify</option>
                  <option value="disqualify">Disqualify</option>
                  <option value="request_more_info">Request More Info</option>
                </select>
              </div>
              <div>
                <label htmlFor="remarks" className="input-label">Remarks</label>
                <textarea
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="Provide justification (min 10 characters for disqualify)..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowDecisionForm(false)} className="btn-secondary btn-sm">Cancel</button>
                <button onClick={() => decideMutation.mutate()} className="btn-primary btn-sm" disabled={decideMutation.isPending}>
                  {decideMutation.isPending ? 'Submitting…' : 'Submit Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Modal */}
      {showReopen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-modal p-6 w-full max-w-md animate-slide-up">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Reopen Case</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="reopenRemarks" className="input-label">Justification</label>
                <textarea
                  id="reopenRemarks"
                  value={reopenRemarks}
                  onChange={(e) => setReopenRemarks(e.target.value)}
                  className="input min-h-[100px]"
                  placeholder="Explain why this case should be reopened (min 10 characters)..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowReopen(false)} className="btn-secondary btn-sm">Cancel</button>
                <button onClick={() => reopenMutation.mutate()} className="btn-primary btn-sm" disabled={reopenMutation.isPending}>
                  {reopenMutation.isPending ? 'Reopening…' : 'Reopen Case'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
